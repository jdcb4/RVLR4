/** Shared by the offline app policy and the public release policy. */
export const SUPPORT_EMAIL = "rvlry@jboxgames.com";
export const PRIVACY_DATE = "24 October 2026";
export const PRIVACY_SECTIONS = [
  {
    title: "Information on your device",
    text: "RVLRY stores game setup, player and team names, custom clues, written quiz answers, scores, progress and preferences on your device so games can resume. You can use nicknames. No account, real name or email address is required to play. Gameplay information is not sent to us or other players’ devices. There are no cloud saves and Android backup is disabled.",
  },
  {
    title: "Network requests and advertising",
    text: "RVLRY is free, with no advertising, purchases, analytics or advertising SDKs. It does not request your contacts, microphone, camera or location. Initial content, fonts and artwork are bundled. Playing works offline. If you choose Check for new words, the app downloads public word and Trivia files from content.jboxgames.com, hosted by Cloudflare. These requests contain no game saves, names, answers, account identifiers or cookies. Cloudflare receives your IP address and request information to deliver and protect the service under its privacy policy. Application request logging is disabled; Cloudflare may process operational and security information under its own retention practices.",
  },
  {
    title: "Audience and shared play",
    text: "RVLRY is intended for adults. Simple mode selects Easy-rated content; it is a difficulty preference, not an age rating or a guarantee of suitability for children. People sharing a phone can see information saved on that phone. Screenshots are permitted and sharing them is controlled by the device user.",
  },
  {
    title: "Removing information",
    text: "To remove local games, downloaded content and preferences, use Android Settings → Apps → RVLRY → Storage → Clear storage, or uninstall the app. There is no server-side player account to delete.",
  },
  {
    title: "Support and external services",
    text: "For privacy questions or support, email rvlry@jboxgames.com. Information you choose to send is handled by the app operator using Cloudflare Email Routing and Gmail to respond to your request. Support messages remain in that mailbox until deleted; you may request deletion by email, subject to any applicable legal retention obligation. Google Play, Android, Cloudflare and Google’s email services operate under their own privacy policies. We will update this policy when our practices change.",
  },
] as const;
