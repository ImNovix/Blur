/**
 * Formats a Roblox/OpenCloud locale (e.g. "pt-BR", "en-US")
 * into a human-readable language label relative to the viewer.
 *
 * Returns undefined when the locales are equal or invalid.
 */
export function formatProfileUserLanguage(profileUserLocale) {
  if (!profileUserLocale) return;

  // Get viewer language from browser
  const langs = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  const viewingUserLocale = langs[0]?.replace("-", "_");
  if (!viewingUserLocale) return;

  if (viewingUserLocale === profileUserLocale) return;

  // Normalize to BCP-47
  const viewer = viewingUserLocale.replace("_", "-");
  const profile = profileUserLocale.replace("_", "-");

  const viewerLang = viewer.split("-")[0];
  const profileLang = profile.split("-")[0];

  let formatter;
  try {
    formatter = new Intl.DisplayNames([viewerLang], { type: "language" });
  } catch {
    return;
  }

  try {
    // Same language → include region
    if (viewerLang === profileLang) {
      return formatter.of(profile);
    }

    // Different language → only base language
    return formatter.of(profileLang);
  } catch {
    return;
  }
}