import type { ImposterSnapshot } from "@/domain/imposter/types";
import type { ImposterStoragePayload } from "@/features/imposter/imposterSingleplayerAppTypes";
import {
  clearImposterSavedState,
  loadImposterSavedState,
  saveImposterState,
} from "@/services/imposterStorage";

export async function loadImposterResumeRecord(): Promise<ImposterStoragePayload | null> {
  const record = await loadImposterSavedState();
  if (!record) return null;
  if (record.snapshot.step === "results") {
    await clearImposterSavedState();
    return null;
  }
  return record;
}

export async function persistImposterSnapshot(
  snapshot: ImposterSnapshot,
): Promise<ImposterStoragePayload | null> {
  if (snapshot.step === "landing") return null;
  if (snapshot.step === "results") {
    await clearImposterSavedState();
    return null;
  }
  const record: ImposterStoragePayload = {
    schemaVersion: 1,
    lastSavedAt: new Date().toISOString(),
    snapshot,
  };
  await saveImposterState(record);
  return record;
}
