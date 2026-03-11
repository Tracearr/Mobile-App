/**
 * Expo config plugin to fix iOS VPN routing for React Native networking.
 *
 * iOS has a known bug (since 13.3.1) where pre-existing TCP connections survive
 * VPN tunnel activation and continue routing outside the tunnel. React Native's
 * NSURLSession uses default configuration which does NOT set waitsForConnectivity,
 * causing immediate connection failures when traffic should route through a VPN
 * (e.g. Tailscale) but the session hasn't picked up the VPN route yet.
 *
 * This plugin injects a custom NSURLSessionConfigurationProvider into the iOS
 * AppDelegate that sets waitsForConnectivity = YES, making NSURLSession wait for
 * VPN readiness instead of failing immediately with "network unreachable."
 *
 * @see https://protonvpn.com/blog/apple-ios-vulnerability-disclosure
 * @see https://github.com/facebook/react-native/pull/27701
 */
const { withAppDelegate } = require('expo/config-plugins');

module.exports = function withVPNNetworking(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'objcpp' && config.modResults.language !== 'objc') {
      throw new Error('withVPNNetworking: Only Objective-C(++) AppDelegate is supported');
    }

    let contents = config.modResults.contents;

    // Skip if already applied
    if (contents.includes('RCTSetCustomNSURLSessionConfigurationProvider')) {
      return config;
    }

    // Add import for RCTHTTPRequestHandler (contains the provider function)
    if (!contents.includes('RCTHTTPRequestHandler.h')) {
      contents = contents.replace(
        '#import "AppDelegate.h"',
        '#import "AppDelegate.h"\n#import <React/RCTHTTPRequestHandler.h>'
      );
    }

    // Insert the provider call before [super application:didFinishLaunchingWithOptions:]
    // This must run before the React bridge initializes so the custom config is picked up
    const superCall =
      'return [super application:application didFinishLaunchingWithOptions:launchOptions];';
    if (!contents.includes(superCall)) {
      throw new Error(
        'withVPNNetworking: Could not find [super application:didFinishLaunchingWithOptions:] in AppDelegate'
      );
    }

    const providerCode = `
  // Configure NSURLSession to wait for network path readiness (VPN tunnel routing).
  // Fixes connectivity failures when using Tailscale or other iOS VPN apps where
  // the tunnel is established but NSURLSession hasn't picked up the route yet.
  RCTSetCustomNSURLSessionConfigurationProvider(^NSURLSessionConfiguration *{
    NSURLSessionConfiguration *sessionConfig = [NSURLSessionConfiguration defaultSessionConfiguration];
    sessionConfig.waitsForConnectivity = YES;
    [sessionConfig setHTTPShouldSetCookies:YES];
    [sessionConfig setHTTPCookieAcceptPolicy:NSHTTPCookieAcceptPolicyAlways];
    [sessionConfig setHTTPCookieStorage:[NSHTTPCookieStorage sharedHTTPCookieStorage]];
    return sessionConfig;
  });

  `;

    contents = contents.replace(superCall, providerCode + superCall);

    config.modResults.contents = contents;
    return config;
  });
};
