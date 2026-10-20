import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import { NativeNavigation } from "@/app/NativeNavigation";
import { RouteLoadingScreen } from "@/app/RouteLoadingScreen";
import { StorageNotice } from "@/components/StorageNotice";

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <NativeNavigation />
      <StorageNotice />
      <Suspense fallback={<RouteLoadingScreen />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
