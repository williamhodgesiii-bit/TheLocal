import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The iPhone app loads the live site, so every fix and new place reaches it the moment Vercel
 * deploys, with no App Store update. Native pieces (location, share sheet, haptics, push,
 * opening theplatenextdoor.com links in the app) are called from the site through lib/native.ts.
 * Without a connection it shows www/offline.html instead of a blank screen.
 */
const config: CapacitorConfig = {
  appId: "com.theplatenextdoor.app",
  appName: "The Plate Next Door",
  webDir: "www",
  server: {
    url: "https://www.theplatenextdoor.com",
    errorPath: "offline.html",
  },
  ios: {
    // the site pads itself for the notch and home bar (env(safe-area-inset-*))
    contentInset: "never",
    backgroundColor: "#F4EFE1",
    // Back and forward swipes move through the app's own history
    allowsBackForwardNavigationGestures: true,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: "#F4EFE1", showSpinner: false },
    StatusBar: { style: "LIGHT", overlaysWebView: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
