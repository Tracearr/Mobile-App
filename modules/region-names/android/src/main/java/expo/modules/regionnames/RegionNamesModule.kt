package expo.modules.regionnames

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

// Hermes has no Intl.DisplayNames; the platform names any region in any language.
class RegionNamesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RegionNames")

    Function("regionName") { code: String, language: String ->
      runCatching { Locale.Builder().setRegion(code).build() }
        .getOrNull()
        ?.getDisplayCountry(Locale.forLanguageTag(language))
        ?.takeIf { it.isNotEmpty() && it != code }
    }
  }
}
