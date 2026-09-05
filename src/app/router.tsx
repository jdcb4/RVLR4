import { lazy } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { RootLayout } from "@/app/RootLayout";
import { NotFoundPage, RouteErrorScreen } from "@/app/RouteErrorScreen";
import { MultiplayerHomePage } from "@/features/multiplayer/MultiplayerHomePage";

const EnterNamePage = lazy(() =>
  import("@/features/multiplayer/EnterNamePage").then((module) => ({
    default: module.EnterNamePage,
  })),
);
const RoomPage = lazy(() =>
  import("@/features/multiplayer/RoomPage").then((module) => ({ default: module.RoomPage })),
);
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
const HatSingleplayerApp = lazy(() =>
  import("@/features/hat-game/HatSingleplayerApp").then((module) => ({
    default: module.HatSingleplayerApp,
  })),
);
const ImposterSingleplayerApp = lazy(() =>
  import("@/features/imposter/ImposterSingleplayerApp").then((module) => ({
    default: module.ImposterSingleplayerApp,
  })),
);

const baseUrl = import.meta.env.BASE_URL;

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <MultiplayerHomePage /> },
      { path: "passnplay", element: <PassNPlayHubPage /> },
      // Permanent redirect for shared links that pre-date the rename.
      { path: "legacy", element: <Navigate replace to="/passnplay" /> },
      { path: "name", element: <EnterNamePage /> },
      { path: "room/:code", element: <RoomPage /> },
      { path: "games/whowhatwhere", element: <WhoWhatWhereSingleplayerApp /> },
      { path: "games/hat", element: <HatSingleplayerApp /> },
      { path: "games/imposter", element: <ImposterSingleplayerApp /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes, {
  basename: baseUrl.replace(/\/$/, "") || "/",
});
