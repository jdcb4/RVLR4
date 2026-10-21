import type { ImposterSnapshot } from "@/domain/imposter/types";

export type ImposterStoragePayload = {
  schemaVersion: 1;
  lastSavedAt: string;
  snapshot: ImposterSnapshot;
};
