import { useEffect, useState } from "react";

import type { ImposterSnapshot } from "@/domain/imposter/types";
import type { ImposterStoragePayload } from "@/features/imposter/imposterSingleplayerAppTypes";
import {
  loadImposterResumeRecord,
  persistImposterSnapshot,
} from "@/features/imposter/imposterSingleplayerPersistence";

/** Owns the browser-storage lifecycle so the Imposter controller only coordinates user actions. */
export function useImposterSingleplayerPersistence(snapshot: ImposterSnapshot) {
  const [savedRecord, setSavedRecord] = useState<ImposterStoragePayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadImposterResumeRecord()
      .then(setSavedRecord)
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (loaded && snapshot.step !== "landing") {
      void persistImposterSnapshot(snapshot).then(setSavedRecord);
    }
  }, [loaded, snapshot]);

  return { loaded, savedRecord, setSavedRecord };
}
