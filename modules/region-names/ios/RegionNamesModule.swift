import ExpoModulesCore

// Hermes has no Intl.DisplayNames; the platform names any region in any language.
public class RegionNamesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RegionNames")

    Function("regionName") { (code: String, language: String) -> String? in
      Locale(identifier: language).localizedString(forRegionCode: code)
    }
  }
}
