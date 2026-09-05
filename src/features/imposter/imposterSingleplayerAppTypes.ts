import type React from "react";

import type { ImposterSnapshot } from "@/domain/imposter/types";

export type ImposterStoragePayload = {
  schemaVersion: 1;
  lastSavedAt: string;
  snapshot: ImposterSnapshot;
};

export type ScreenModel = {
  content: React.ReactNode;
  actions?: React.ReactNode;
};
