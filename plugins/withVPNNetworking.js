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
 * Supports both Swift (Expo SDK 55+) and Objective-C AppDelegates.
 *
 * @see https://protonvpn.com/blog/apple-ios-vulnerability-disclosure
 * @see https://github.com/facebook/react-native/pull/27701
 */
const { withAppDelegate } = require('expo/config-plugins');

module.exports = function withVPNNetworking(config) {
  return withAppDelegate(config, (config) => {
    const language = config.modResults.language;

    if (language === 'swift') {
      config.modResults.contents = applySwift(config.modResults.contents);
    } else if (language === 'objcpp' || language === 'objc') {
      config.modResults.contents = applyObjC(config.modResults.contents);
    } else {
      throw new Error(`withVPNNetworking: Unsupported AppDelegate language: ${language}`);
    }

    return config;
  });
};

function applySwift(contents) {
  // Skip if already applied
  if (contents.includes('RCTSetCustomNSURLSessionConfigurationProvider')) {
    return contents;
  }

  if (!contents.includes('RCTHTTPRequestHandler')) {
    contents = contents.replace(
      'internal import React',
      'internal import React\nimport RCTHTTPRequestHandler'
    );
  }

  const startCall = 'factory.startReactNative(';

  if (!contents.includes(startCall)) {
    throw new Error(
      'withVPNNetworking: Could not find factory.startReactNative( in Swift AppDelegate'
    );
  }

  const providerCode = `// Configure NSURLSession for VPN/Tailscale compatibility.
    // - waitsForConnectivity: wait for VPN route instead of failing immediately
    // - allowsExpensiveNetworkAccess: iOS may classify VPN as "expensive"
    // - allowsConstrainedNetworkAccess: iOS may classify VPN as "constrained" in Low Data Mode
    RCTSetCustomNSURLSessionConfigurationProvider { () -> URLSessionConfiguration in
      let config = URLSessionConfiguration.default
      config.waitsForConnectivity = true
      config.allowsExpensiveNetworkAccess = true
      config.allowsConstrainedNetworkAccess = true
      config.httpShouldSetCookies = true
      config.httpCookieAcceptPolicy = .always
      config.httpCookieStorage = .shared
      return config
    }

    `;

  contents = contents.replace(startCall, providerCode + startCall);

  return contents;
}

function applyObjC(contents) {
  if (contents.includes('RCTSetCustomNSURLSessionConfigurationProvider')) {
    return contents;
  }

  if (!contents.includes('RCTHTTPRequestHandler.h')) {
    contents = contents.replace(
      '#import "AppDelegate.h"',
      '#import "AppDelegate.h"\n#import <React/RCTHTTPRequestHandler.h>'
    );
  }

  const superCall =
    'return [super application:application didFinishLaunchingWithOptions:launchOptions];';
  if (!contents.includes(superCall)) {
    throw new Error(
      'withVPNNetworking: Could not find [super application:didFinishLaunchingWithOptions:] in AppDelegate'
    );
  }

  const providerCode = `
  // Configure NSURLSession to wait for VPN tunnel routing readiness.
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

  return contents;
}
