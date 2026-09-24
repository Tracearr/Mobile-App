import Foundation
import JavaScriptCore
import Security
import WidgetKit
import os

// Runs before every timeline request. Fetches the two endpoints the app polls,
// builds the same props through the app's own TypeScript, and writes the
// timeline expo-widgets' provider then parses. A failure of any kind leaves the
// stored timeline alone so its stale and dated marks still fire.
enum NowPlayingFetch {
  private static let log = Logger(subsystem: "com.tracearr.app.widgets", category: "fetch")
  private static let contextKey = "tracearr.widgetContext"
  private static let authFailedKey = "tracearr.widgetAuthFailedAt"
  private static let timelineKey = "__expo_widgets_NowPlaying_timeline"
  // expo-secure-store's account for the key the app writes with the app group.
  private static let tokenAccount = "tracearr_access_token_v2"
  private static let liveInterval: TimeInterval = 15 * 60
  private static let idleInterval: TimeInterval = 30 * 60
  private static let requestTimeout: TimeInterval = 8

  private struct Context: Decodable {
    let writtenAt: Double
    let serverUrl: String
  }

  private static var appGroup: String? {
    Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String
  }

  private static var defaults: UserDefaults? {
    appGroup.flatMap { UserDefaults(suiteName: $0) }
  }

  static func refresh() async -> TimelineReloadPolicy {
    guard let defaults, let contextJson = defaults.string(forKey: contextKey),
          let contextData = contextJson.data(using: .utf8),
          let context = try? JSONDecoder().decode(Context.self, from: contextData) else {
      return .atEnd
    }
    if defaults.double(forKey: authFailedKey) > context.writtenAt {
      log.info("skipping fetch, token was rejected after the app last wrote its context")
      return .after(Date().addingTimeInterval(idleInterval))
    }
    guard let token = readToken() else {
      log.info("no shared access token")
      return .after(Date().addingTimeInterval(idleInterval))
    }

    let base = context.serverUrl.hasSuffix("/") ? String(context.serverUrl.dropLast()) : context.serverUrl
    async let sessions = get("\(base)/api/v1/sessions/active", token: token)
    async let health = get("\(base)/api/v1/servers/health", token: token)
    let results = await [sessions, health]
    if results.contains(where: { $0.status == 401 || $0.status == 403 }) {
      defaults.set(Date().timeIntervalSince1970 * 1000, forKey: authFailedKey)
      log.error("token rejected")
      return .after(Date().addingTimeInterval(idleInterval))
    }
    guard let sessionsBody = results[0].body, let healthBody = results[1].body else {
      log.error("fetch failed: \(results[0].status) \(results[1].status)")
      return .after(Date().addingTimeInterval(liveInterval))
    }
    guard let sessionsJson = try? JSONSerialization.jsonObject(with: sessionsBody) as? [String: Any],
          let healthJson = try? JSONSerialization.jsonObject(with: healthBody) as? [String: Any],
          let sessionList = sessionsJson["data"] as? [Any], let healthList = healthJson["data"] as? [Any],
          let contextObject = try? JSONSerialization.jsonObject(with: contextData) else {
      log.error("unexpected response shape")
      return .after(Date().addingTimeInterval(liveInterval))
    }

    let input: [String: Any] = [
      "sessions": sessionList,
      "unhealthyServers": healthList,
      "context": contextObject,
      "now": Int(Date().timeIntervalSince1970 * 1000),
    ]
    guard let inputData = try? JSONSerialization.data(withJSONObject: input),
          let inputJson = String(data: inputData, encoding: .utf8),
          let entries = Builder.shared.build(inputJson) else {
      return .after(Date().addingTimeInterval(liveInterval))
    }
    defaults.set(entries, forKey: timelineKey)

    let live = !sessionList.isEmpty || !healthList.isEmpty
    log.info("wrote \(entries.count) entries, live=\(live)")
    return .after(Date().addingTimeInterval(live ? liveInterval : idleInterval))
  }

  private static func readToken() -> String? {
    guard let appGroup else { return nil }
    let account = Data(tokenAccount.utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "app:no-auth",
      kSecAttrAccount as String: account,
      kSecAttrGeneric as String: account,
      kSecAttrAccessGroup as String: appGroup,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess, let data = item as? Data else {
      if status != errSecItemNotFound { log.error("keychain read failed: \(status)") }
      return nil
    }
    return String(data: data, encoding: .utf8)
  }

  private struct Response {
    let status: Int
    let body: Data?
  }

  private static let session: URLSession = {
    let config = URLSessionConfiguration.ephemeral
    config.timeoutIntervalForRequest = requestTimeout
    config.timeoutIntervalForResource = requestTimeout
    config.waitsForConnectivity = false
    return URLSession(configuration: config)
  }()

  private static func get(_ url: String, token: String) async -> Response {
    guard let url = URL(string: url) else { return Response(status: 0, body: nil) }
    var request = URLRequest(url: url)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    do {
      let (data, response) = try await session.data(for: request)
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      return Response(status: status, body: (200..<300).contains(status) ? data : nil)
    } catch {
      log.error("\(url.path, privacy: .public): \(error.localizedDescription, privacy: .public)")
      return Response(status: 0, body: nil)
    }
  }

  // One JavaScriptCore context per extension process, holding the bundle
  // scripts/ios/bundle-widget-fetch.sh writes; the layout runtime expo-widgets
  // ships is a separate context.
  private final class Builder {
    static let shared = Builder()
    private var context: JSContext?

    func build(_ inputJson: String) -> [[String: Any]]? {
      guard let context = load() else { return nil }
      context.exception = nil
      guard let function = context.objectForKeyedSubscript("__tracearrBuildTimeline"), function.isObject,
            let result = function.call(withArguments: [inputJson]), context.exception == nil,
            let json = result.toString(), let data = json.data(using: .utf8),
            let entries = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        NowPlayingFetch.log.error("builder failed: \(context.exception?.toString() ?? "no result", privacy: .public)")
        return nil
      }
      return entries.compactMap { Builder.stripNulls($0) as? [String: Any] }
    }

    private func load() -> JSContext? {
      if let context { return context }
      guard let url = Bundle.main.url(forResource: "TracearrWidgetFetch", withExtension: "js"),
            let script = try? String(contentsOf: url, encoding: .utf8),
            let context = JSContext() else {
        NowPlayingFetch.log.error("TracearrWidgetFetch.js missing")
        return nil
      }
      context.evaluateScript(script)
      if let exception = context.exception {
        NowPlayingFetch.log.error("bundle failed: \(exception.toString() ?? "", privacy: .public)")
        return nil
      }
      self.context = context
      return context
    }

    // UserDefaults refuses NSNull anywhere in a property list.
    private static func stripNulls(_ value: Any) -> Any? {
      if value is NSNull { return nil }
      if let dict = value as? [String: Any] {
        return dict.compactMapValues { stripNulls($0) }
      }
      if let list = value as? [Any] {
        return list.compactMap { stripNulls($0) }
      }
      return value
    }
  }
}
