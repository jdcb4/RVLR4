import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import { deviceBridge } from "@/services/nativeSnapshotStore";

type ActivityListener = (active: boolean) => void;
const listeners = new Set<ActivityListener>();
let nativeActive = true;
let cleanupActivity: (() => void) | null = null;
let keepAwakeQueue = Promise.resolve();

export const isDeviceActive = () => nativeActive && !document.hidden;

/** Each subscriber sees transitions once even when native and DOM events both arrive. */
export function subscribeDeviceActivity(listener: ActivityListener): () => void {
  let previous: boolean | undefined;
  const notify = (active: boolean) => {
    if (active !== previous) {
      previous = active;
      listener(active);
    }
  };
  listeners.add(notify);
  if (!cleanupActivity) cleanupActivity = startActivityEvents();
  notify(isDeviceActive());
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) {
      cleanupActivity?.();
      cleanupActivity = null;
    }
  };
}

function startActivityEvents() {
  let disposed = false;
  let nativeEvents = 0;
  const removers: Array<() => Promise<void>> = [];
  const publish = () => {
    if (!disposed) listeners.forEach((listener) => listener(isDeviceActive()));
  };
  document.addEventListener("visibilitychange", publish);
  if (Capacitor.isNativePlatform()) {
    nativeActive = true;
    const receiveNative = (active: boolean) => {
      if (disposed) return;
      nativeEvents += 1;
      nativeActive = active;
      publish();
    };
    const attach = (handle: Promise<{ remove(): Promise<void> }>) => {
      void handle.then(
        (subscription) => {
          if (disposed) void subscription.remove().catch(() => undefined);
          else removers.push(() => subscription.remove());
        },
        () => receiveNative(false),
      );
    };
    attach(App.addListener("appStateChange", ({ isActive }) => receiveNative(isActive)));
    // Android pause arrives before onStop/appStateChange, so freeze the turn promptly.
    attach(App.addListener("pause", () => receiveNative(false)));
    attach(App.addListener("resume", () => receiveNative(true)));
    void App.getState().then(
      ({ isActive }) => {
        if (!disposed && nativeEvents === 0) {
          nativeActive = isActive;
          publish();
        }
      },
      () => {
        if (nativeEvents === 0) receiveNative(false);
      },
    );
  } else {
    nativeActive = true;
  }
  return () => {
    disposed = true;
    document.removeEventListener("visibilitychange", publish);
    removers.forEach((remove) => void remove().catch(() => undefined));
  };
}

export function setDeviceKeepAwake(enabled: boolean): Promise<void> {
  const result = keepAwakeQueue.then(async () => {
    if (Capacitor.isNativePlatform()) {
      await deviceBridge.setKeepAwake({ enabled: enabled && isDeviceActive() });
    }
  });
  keepAwakeQueue = result.catch(() => undefined);
  return result;
}
