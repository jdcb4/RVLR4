import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** A game gets first refusal so Back cannot bypass its save/pause boundary. */
export function NativeNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener("backButton", () => {
      const dialog = Array.from(document.querySelectorAll<HTMLDialogElement>("dialog[open]")).at(
        -1,
      );
      if (dialog) {
        const cancel = new Event("cancel", { cancelable: true });
        if (dialog.dispatchEvent(cancel)) dialog.close();
        return;
      }
      const event = new Event("rvlry:back", { cancelable: true });
      if (!window.dispatchEvent(event)) return;
      if (location.pathname === "/") void App.minimizeApp();
      else navigate("/");
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [location.pathname, navigate]);

  return null;
}
