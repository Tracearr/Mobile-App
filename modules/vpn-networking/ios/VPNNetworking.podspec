Pod::Spec.new do |s|
  s.name           = 'VPNNetworking'
  s.version        = '1.0.0'
  s.summary        = 'NSURLSession configuration for reaching self-hosted servers over a VPN'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'React-Core'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.swift'
end
