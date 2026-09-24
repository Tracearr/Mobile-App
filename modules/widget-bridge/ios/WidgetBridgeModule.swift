import ExpoModulesCore
import UIKit

// The widget extension fetches on its own and needs what the app knows: the
// server, the language and the strings. They travel through the app group's
// UserDefaults, next to the timeline expo-widgets keeps there.
public class WidgetBridgeModule: Module {
  private static let contextKey = "tracearr.widgetContext"

  private var defaults: UserDefaults? {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String else {
      return nil
    }
    return UserDefaults(suiteName: group)
  }

  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    Function("setContext") { (json: String) in
      self.defaults?.set(json, forKey: Self.contextKey)
    }

    Function("clearContext") {
      self.defaults?.removeObject(forKey: Self.contextKey)
    }

    // UIApplication is main-thread only; synchronous functions run on the JS
    // thread today, and a sync hop from the main thread itself would deadlock.
    Function("backgroundRefreshStatus") { () -> String in
      let read: () -> String = {
        switch UIApplication.shared.backgroundRefreshStatus {
        case .available: return "available"
        case .denied: return "denied"
        case .restricted: return "restricted"
        @unknown default: return "unknown"
        }
      }
      return Thread.isMainThread ? read() : DispatchQueue.main.sync(execute: read)
    }
  }
}
