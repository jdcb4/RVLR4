import type { Express } from "express";

export type HealthState = {
  shuttingDown: boolean;
};

export function registerHealthRoute(app: Express, state: HealthState, version: string): void {
  app.get("/api/health", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.status(state.shuttingDown ? 503 : 200).json({
      status: state.shuttingDown ? "shutting-down" : "ok",
      version,
    });
  });
}
