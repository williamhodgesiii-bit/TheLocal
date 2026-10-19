/**
 * The iPhone app (native/) is this website inside a native shell. In the app these helpers use the
 * phone itself: its location, share sheet, haptics, push notifications, a sign-in that survives iOS
 * clearing website storage, and theplatenextdoor.com links that open in the app. In a browser they
 * fall back to the web versions or do nothing. The plugin code only loads inside the app.
 */

type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
type Listener = { remove: () => Promise<void> };

/** true inside the iPhone app, false in every browser */
export const isNativeApp = () => typeof window !== "undefined" && !!(window as CapWindow).Capacitor?.isNativePlatform?.();

/* ------------------------------------------------------------------ plugins */

type Plugins = {
  App: {
    addListener(e: "appUrlOpen", f: (d: { url: string }) => void): Promise<Listener>;
    getLaunchUrl(): Promise<{ url: string } | undefined>;
  };
  Geolocation: {
    getCurrentPosition(o: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }): Promise<{ coords: { latitude: number; longitude: number } }>;
  };
  Share: { share(o: { title?: string; text?: string; url?: string; files?: string[] }): Promise<unknown> };
  Haptics: {
    impact(o: { style: "LIGHT" | "MEDIUM" | "HEAVY" }): Promise<void>;
    notification(o: { type: "SUCCESS" | "WARNING" | "ERROR" }): Promise<void>;
    selectionStart(): Promise<void>;
    selectionChanged(): Promise<void>;
    selectionEnd(): Promise<void>;
  };
  Preferences: {
    get(o: { key: string }): Promise<{ value: string | null }>;
    set(o: { key: string; value: string }): Promise<void>;
    remove(o: { key: string }): Promise<void>;
  };
  Filesystem: { writeFile(o: { path: string; data: string; directory: "CACHE" }): Promise<{ uri: string }> };
  PushNotifications: {
    checkPermissions(): Promise<{ receive: string }>;
    requestPermissions(): Promise<{ receive: string }>;
    register(): Promise<void>;
    addListener(e: "registration", f: (t: { value: string }) => void): Promise<Listener>;
    addListener(e: "registrationError", f: (err: { error: string }) => void): Promise<Listener>;
    addListener(e: "pushNotificationActionPerformed", f: (a: { notification: { data?: Record<string, unknown> } }) => void): Promise<Listener>;
    removeAllDeliveredNotifications(): Promise<void>;
  };
};

const loaded: Partial<Record<keyof Plugins, Promise<{ p: unknown }>>> = {};
/**
 * Runs `fn` with a native plugin. The plugin is only ever handed to `fn`, never returned from a
 * promise: Capacitor's plugin object answers any property, `then` included, so a promise that
 * resolved to it would never settle.
 */
function withPlugin<K extends keyof Plugins, R>(name: K, fn: (p: Plugins[K]) => Promise<R>): Promise<R> {
  loaded[name] ??= import("@capacitor/core").then((c) => ({ p: c.registerPlugin(name) }));
  return loaded[name]!.then(({ p }) => fn(p as Plugins[K]));
}

/* ----------------------------------------------------------------- location */

/** where the phone is, as [lat, lng]; rejects when location is off or refused */
export async function currentPosition(timeout = 10000): Promise<[number, number]> {
  if (isNativeApp()) {
    // the app's own permission prompt; navigator.geolocation in the app would ask a second time
    const pos = await withPlugin("Geolocation", (g) => g.getCurrentPosition({ enableHighAccuracy: false, timeout, maximumAge: 600000 }));
    return [pos.coords.latitude, pos.coords.longitude];
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) throw new Error("no-geolocation");
  return new Promise((res, rej) =>
    navigator.geolocation.getCurrentPosition((p) => res([p.coords.latitude, p.coords.longitude]), rej, { enableHighAccuracy: false, timeout, maximumAge: 600000 })
  );
}

/** whether this device can try for a location at all */
export const canLocate = () => isNativeApp() || (typeof navigator !== "undefined" && "geolocation" in navigator);

/* -------------------------------------------------------------------- share */

const closed = (e: unknown) => /cancel|abort/i.test(`${(e as { name?: string })?.name ?? ""} ${(e as Error)?.message ?? ""}`);

/**
 * The share sheet for a link (the phone's own in the app), or the clipboard where there's none.
 * "copied" means the caller should say so; "dismissed" means they closed the sheet.
 */
export async function shareLink(o: { title: string; text?: string; url: string }): Promise<"shared" | "copied" | "dismissed"> {
  try {
    if (isNativeApp()) {
      await withPlugin("Share", (sh) => sh.share(o));
      return "shared";
    }
    if (navigator.share) {
      await navigator.share(o);
      return "shared";
    }
    await navigator.clipboard.writeText(o.url);
    return "copied";
  } catch (e) {
    if (closed(e)) return "dismissed";
    try {
      await navigator.clipboard.writeText(o.url);
      return "copied";
    } catch {
      return "dismissed";
    }
  }
}

/** the share sheet for an image (the passport card); null where the device can't share files */
export async function shareImage(blob: Blob, name: string, text: string): Promise<"shared" | "dismissed" | null> {
  try {
    if (isNativeApp()) {
      const data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(r.error);
        r.readAsDataURL(blob);
      });
      const { uri } = await withPlugin("Filesystem", (f) => f.writeFile({ path: name, data, directory: "CACHE" }));
      await withPlugin("Share", (sh) => sh.share({ text, files: [uri] }));
      return "shared";
    }
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
    return null;
  } catch {
    return "dismissed";
  }
}

/* ------------------------------------------------------------------ haptics */

/** a small tap felt in the hand (app only): "tap" for a toggle, "done" for something that landed */
export function feel(kind: "tap" | "done" = "tap") {
  if (!isNativeApp()) return;
  withPlugin("Haptics", (h) => (kind === "done" ? h.notification({ type: "SUCCESS" }) : h.impact({ style: "LIGHT" }))).catch(() => {});
}

/* -------------------------------------------------------------- the session */

/**
 * Where the sign-in lives in the app. iOS can clear a web view's localStorage when the phone runs
 * low on space, which would sign people out; the app's own storage stays until it's deleted.
 */
export const nativeAuthStorage = {
  async getItem(key: string) {
    const { value } = await withPlugin("Preferences", (pr) => pr.get({ key }));
    if (value !== null) return value;
    try {
      return localStorage.getItem(key); // a session from before this storage existed
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    await withPlugin("Preferences", (pr) => pr.set({ key, value }));
  },
  async removeItem(key: string) {
    await withPlugin("Preferences", (pr) => pr.remove({ key }));
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/* ----------------------------------------------------- links into the app */

const OURS = /^https:\/\/(www\.)?theplatenextdoor\.com(\/|$)/i;

/** a theplatenextdoor.com link tapped in Mail, Messages or Safari opens that page in the app */
function openInApp(url: string) {
  if (!OURS.test(url)) return;
  const u = new URL(url);
  const path = u.pathname + u.search + u.hash;
  if (path === location.pathname + location.search + location.hash) return;
  location.assign(path);
}

/* --------------------------------------------------------------------- push */

let pushToken: string | null = null;
/** this phone's push address, once it has one */
export const currentPushToken = () => pushToken;

/** "granted", "denied", "prompt" (not asked yet), or "none" outside the app */
export async function pushPermission(): Promise<string> {
  if (!isNativeApp()) return "none";
  try {
    const { receive } = await withPlugin("PushNotifications", (pu) => pu.checkPermissions());
    return receive.startsWith("prompt") ? "prompt" : receive;
  } catch {
    return "none";
  }
}

/** asks once (iOS never shows the prompt twice), then registers; returns the answer */
export async function askForPush(): Promise<string> {
  return withPlugin("PushNotifications", async (pu) => {
    const { receive } = await pu.requestPermissions();
    if (receive === "granted") await pu.register();
    return receive;
  });
}

let started = false;
/**
 * Set up the app's native side once: links that open the app, push sign-up and taps on a
 * notification. `onToken` stores this phone's push address with the account.
 */
export async function startNative(onToken: (token: string) => void) {
  if (started || !isNativeApp()) return;
  started = true;
  await withPlugin("App", async (app) => {
    await app.addListener("appUrlOpen", ({ url }) => openInApp(url));
    const launch = await app.getLaunchUrl();
    if (launch?.url) openInApp(launch.url);
  }).catch(() => {});

  await withPlugin("PushNotifications", async (pu) => {
    await pu.addListener("registration", ({ value }) => {
      pushToken = value;
      onToken(value);
    });
    await pu.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const path = notification.data?.path;
      if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) location.assign(path);
    });
    // already said yes on this phone: register again, since the address can change
    const { receive } = await pu.checkPermissions();
    if (receive === "granted") await pu.register();
  }).catch(() => {});
}

/** clear notifications sitting on the lock screen once they've been seen in the app */
export function clearDelivered() {
  if (!isNativeApp()) return;
  withPlugin("PushNotifications", (pu) => pu.removeAllDeliveredNotifications()).catch(() => {});
}
