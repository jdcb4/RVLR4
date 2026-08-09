import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import { RouteLoadingScreen } from "@/app/RouteLoadingScreen";

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <Suspense fallback={<RouteLoadingScreen />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
