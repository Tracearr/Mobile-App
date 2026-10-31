import UIKit
import UserNotifications
import os

class NotificationService: UNNotificationServiceExtension {
  private let lock = NSLock()
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var content: UNMutableNotificationContent?
  private var task: URLSessionDataTask?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
      contentHandler(request.content)
      return
    }
    self.content = content

    #if DEBUG
    Logger(subsystem: "com.tracearr.app.NotificationService", category: "push")
      .notice("userInfo: \(String(describing: request.content.userInfo), privacy: .public)")
    #endif

    guard let url = NotificationService.imageURL(in: request.content.userInfo) else {
      deliver(content)
      return
    }

    let config = URLSessionConfiguration.ephemeral
    config.timeoutIntervalForRequest = 8
    config.timeoutIntervalForResource = 10
    task = URLSession(configuration: config).dataTask(with: url) { data, response, _ in
      if let data,
        let status = (response as? HTTPURLResponse)?.statusCode, (200..<300).contains(status),
        let attachment = NotificationService.attachment(from: data)
      {
        content.attachments = [attachment]
      }
      self.deliver(content)
    }
    task?.resume()
  }

  override func serviceExtensionTimeWillExpire() {
    task?.cancel()
    if let content {
      deliver(content)
    }
  }

  private func deliver(_ content: UNNotificationContent) {
    lock.lock()
    let handler = contentHandler
    contentHandler = nil
    lock.unlock()
    handler?(content)
  }

  static func imageURL(in userInfo: [AnyHashable: Any]) -> URL? {
    guard let body = userInfo["body"] as? [String: Any],
      let rich = body["_richContent"] as? [String: Any],
      let image = rich["image"] as? String,
      let url = URL(string: image),
      url.scheme == "https"
    else { return nil }
    return url
  }

  // Attachments must be JPEG, PNG or GIF, typed by file extension. Those pass through
  // untouched so a PNG keeps its transparency; anything else UIImage can decode (WebP from
  // the image proxy) is re-encoded as JPEG, and anything it can't (SVG) gets no attachment.
  static func attachment(from data: Data) -> UNNotificationAttachment? {
    let bytes = [UInt8](data.prefix(4))
    let file: (Data, String)
    if bytes.starts(with: [0x89, 0x50, 0x4E, 0x47]) {
      file = (data, "png")
    } else if bytes.starts(with: [0xFF, 0xD8, 0xFF]) {
      file = (data, "jpg")
    } else if bytes.starts(with: [0x47, 0x49, 0x46, 0x38]) {
      file = (data, "gif")
    } else if let jpeg = UIImage(data: data)?.jpegData(compressionQuality: 0.9) {
      file = (jpeg, "jpg")
    } else {
      return nil
    }

    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension(file.1)
    do {
      try file.0.write(to: url)
      return try UNNotificationAttachment(identifier: "image", url: url)
    } catch {
      return nil
    }
  }
}
