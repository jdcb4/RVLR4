import type {
  ImposterSnapshot,
  ImposterStoragePayload,
} from "@/features/imposter/imposterSingleplayerAppTypes";
import {
  clearImposterSavedState,
  loadImposterSavedState,
  saveImposterState,
} from "@/services/imposterStorage";

const isStoragePayload = (value: unknown): value is ImposterStoragePayload =>
  Boolean(
    value &&
    typeof value === "object" &&
    "schemaVersion" in value &&
    "snapshot" in value &&
    "lastSavedAt" in value,
  );

export async function loadImposterResumeRecord(): Promise<ImposterStoragePayload | null> {
  const saved = await loadImposterSavedState<ImposterStoragePayload | ImposterSnapshot>();
  if (!saved) return null;
  const record: ImposterStoragePayload = isStoragePayload(saved)
    ? saved
    : { schemaVersion: 1, lastSavedAt: new Date().toISOString(), snapshot: saved };
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
