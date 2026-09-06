import type { ImposterStoragePayload } from "@/features/imposter/imposterSingleplayerAppTypes";
import { localGameStorage, readValidatedRecord } from "@/services/browserStorage";
import { imposterSavedStateSchema } from "@/services/savedStates/imposter";

const STORAGE_KEY = "imposter.state.v1";
export const loadImposterSavedState = async () =>
  readValidatedRecord(STORAGE_KEY, imposterSavedStateSchema);
export const saveImposterState = async (value: ImposterStoragePayload) =>
  localGameStorage.write(STORAGE_KEY, JSON.stringify(value));
export const clearImposterSavedState = async () => {
  localGameStorage.remove(STORAGE_KEY);
};
