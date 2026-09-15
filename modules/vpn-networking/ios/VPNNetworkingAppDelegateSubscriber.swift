import ExpoModulesCore
import React

// iOS keeps connections that predate a VPN tunnel routed outside it, and React Native's
// default session fails those requests immediately instead of waiting for the tunnel's
// route, so a self-hosted server behind Tailscale reads as unreachable.
// See https://protonvpn.com/blog/apple-ios-vulnerability-disclosure
//
// React Native starts from SceneDelegate after launch finishes, so the provider is in
// place before its first request.
public class VPNNetworkingAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    RCTSetCustomNSURLSessionConfigurationProvider {
      let config = URLSessionConfiguration.default
      config.waitsForConnectivity = true
      // iOS may classify a VPN as expensive, or as constrained in Low Data Mode.
      config.allowsExpensiveNetworkAccess = true
      config.allowsConstrainedNetworkAccess = true
      config.httpShouldSetCookies = true
      config.httpCookieAcceptPolicy = .always
      config.httpCookieStorage = .shared
      return config
    }
    return true
  }
}
