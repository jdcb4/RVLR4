import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "au.joed.rvlry",
  appName: "RVLRY",
  webDir: "dist",
  // Capacitor bridge debug logs otherwise include snapshot payloads and player secrets.
  loggingBehavior: "none",
  android: {
    backgroundColor: "#faf8f5",
  },
  plugins: {
    SystemBars: {
      // Capacitor pads older WebViews and exposes correct CSS env insets on newer ones.
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
      style: "LIGHT",
    },
  },
};

export default config;
