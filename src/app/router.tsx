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
const HatGameDevicePage = lazy(() =>
  import("@/features/hat-game/HatGameDevicePage").then((module) => ({
    default: module.HatGameDevicePage,
  })),
);
const ImposterDevicePage = lazy(() =>
  import("@/features/imposter/ImposterDevicePage").then((module) => ({
    default: module.ImposterDevicePage,
  })),
);
const baseUrl = import.meta.env.BASE_URL;
const TriviaPage = lazy(() =>
  import("@/features/trivia/TriviaPage").then((module) => ({ default: module.TriviaPage })),
);

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
      { path: "games/hat", element: <HatGameDevicePage /> },
      { path: "games/imposter", element: <ImposterDevicePage /> },
      { path: "games/trivia", element: <TriviaPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

const createRouter = Capacitor.isNativePlatform() ? createHashRouter : createBrowserRouter;
export const router = createRouter(appRoutes, {
  basename: baseUrl.replace(/\/$/, "") || "/",
});
