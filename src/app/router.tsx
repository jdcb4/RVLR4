import { Capacitor } from "@capacitor/core";
import { lazy } from "react";
import {
  createBrowserRouter,
  createHashRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";

import { RootLayout } from "@/app/RootLayout";
import { NotFoundPage, RouteErrorScreen } from "@/app/RouteErrorScreen";
const PassNPlayHubPage = lazy(() =>
  import("@/features/passnplay/PassNPlayHubPage").then((module) => ({
    default: module.PassNPlayHubPage,
  })),
);
const WhoWhatWhereSingleplayerApp = lazy(() =>
  import("@/features/whowhatwhere/WhoWhatWhereSingleplayerApp").then((module) => ({
    default: module.WhoWhatWhereSingleplayerApp,
  })),
);
const baseUrl = import.meta.env.BASE_URL;

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <PassNPlayHubPage /> },
      { path: "passnplay", element: <Navigate replace to="/" /> },
      // Permanent redirect for shared links that pre-date the rename.
      { path: "legacy", element: <Navigate replace to="/passnplay" /> },
      { path: "games/whowhatwhere", element: <WhoWhatWhereSingleplayerApp /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

const createRouter = Capacitor.isNativePlatform() ? createHashRouter : createBrowserRouter;
export const router = createRouter(appRoutes, {
  basename: baseUrl.replace(/\/$/, "") || "/",
});
