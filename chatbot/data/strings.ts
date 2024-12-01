const localization: LocalizationMap = {
  greeting: {
    en: "{0} VoHiYo",
  },
};

type SupportedLanguages = "en" | "es" | "fr" | "de"; // Add more languages as needed

type LocalizationKeys = "greeting"; // Add more keys as needed

type LocalizationMap = Partial<{
  [key in LocalizationKeys]: Partial<{
    [lang in SupportedLanguages]: string;
  }>;
}>;

export class Strings {
  private static defaultLanguage: SupportedLanguages = "en"; // Default and fallback language

  // Set the default language dynamically
  static setDefaultLanguage(language: SupportedLanguages): void {
    this.defaultLanguage = language;
  }

  // Use a Proxy to provide a flexible and typo-safe interface
  static get strings(): Record<
    LocalizationKeys,
    (...args: string[]) => string
  > {
    return new Proxy(
      {} as Record<LocalizationKeys, (...args: string[]) => string>,
      {
        get: (_, key: string) => {
          // Ensure the key is valid
          if (!localization[key as LocalizationKeys]) {
            console.warn(
              `Key "${key}" does not exist in the localization map.`
            );
            return () => "";
          }

          // Return a function to format and retrieve the string
          return (...args: string[]) =>
            Strings.get(key as LocalizationKeys, args);
        },
      }
    );
  }

  /**
   * Retrieves a localized string for the given key, with optional formatting.
   * Falls back to the default language if the requested language isn't available.
   * @param key - The localization key (e.g., "welcome").
   * @param args - Optional parameters to replace placeholders in the string.
   * @param language - Optional language code (defaults to the default language).
   * @returns The formatted localized string.
   */
  private static get(
    key: LocalizationKeys,
    args?: string[],
    language?: SupportedLanguages
  ): string {
    const lang = language || this.defaultLanguage;

    // Try to retrieve the string for the specified language
    const template =
      localization[key]?.[lang] ||
      localization[key]?.[this.defaultLanguage] ||
      "";

    // Extract the count of placeholders in the template
    const placeholderCount = (template.match(/{\d+}/g) || []).length;

    // Warn if the number of placeholders doesn't match the number of arguments
    if (args && args.length !== placeholderCount) {
      console.warn(
        `Warning: Mismatch in argument count for key "${key}" in language "${lang}". ` +
          `Expected ${placeholderCount} arguments, but got ${args.length}.`
      );
    }

    // Replace placeholders in the string
    return template.replace(
      /{(\d+)}/g,
      (match, index) => args?.[index] || match
    );
  }
}
