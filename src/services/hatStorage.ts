import type { StoragePayload } from "@/features/hat-game/hatSingleplayerAppTypes";
import { localGameStorage, readValidatedRecord } from "@/services/browserStorage";
import { hatSavedStateSchema } from "@/services/savedStates/hat";

const STORAGE_KEY = "hat-game.state.v1";
export const loadSavedState = async () => readValidatedRecord(STORAGE_KEY, hatSavedStateSchema);
export const saveState = async (value: StoragePayload) =>
  localGameStorage.write(STORAGE_KEY, JSON.stringify(value));
export const clearSavedState = async () => {
  localGameStorage.remove(STORAGE_KEY);
};
