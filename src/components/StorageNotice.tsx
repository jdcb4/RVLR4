import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  dismissStorageNotice,
  getStorageNotice,
  subscribeStorageNotice,
} from "@/services/browserStorage";

export function StorageNotice() {
  const message = useSyncExternalStore(subscribeStorageNotice, getStorageNotice, () => null);
  return message ? (
    <aside
      role="status"
      className="fixed inset-x-2 top-2 z-50 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-border bg-card p-3 text-typ-ui shadow-lg"
    >
      <p>{message}</p>
      <Button type="button" variant="outline" onClick={dismissStorageNotice}>
        Dismiss
      </Button>
    </aside>
  ) : null;
}
