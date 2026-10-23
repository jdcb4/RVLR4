import { initializeContentPreferences } from "@/services/contentPreference";
import { initializeWordCatalogue } from "@/services/wordCatalogue";
import { initializeTheme } from "@/themes/themePreference";

/** Every local selection input is ready before routes can create a game. */
export async function initializeApp(): Promise<void> {
  await Promise.all([initializeTheme(), initializeContentPreferences(), initializeWordCatalogue()]);
}
