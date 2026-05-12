import { createBrowserRouter, Navigate } from "react-router-dom";

import { RootLayout } from "@/app/RootLayout";
import { HatGameApp } from "@/features/hat-game/HatGameApp";
import { ImposterApp } from "@/features/imposter/ImposterApp";
import { EnterNamePage } from "@/features/multiplayer/EnterNamePage";
import { MultiplayerHomePage } from "@/features/multiplayer/MultiplayerHomePage";
import { RoomPage } from "@/features/multiplayer/RoomPage";
import { PassNPlayHubPage } from "@/features/passnplay/PassNPlayHubPage";
import { WhoWhatWhereApp } from "@/features/whowhatwhere/WhoWhatWhereApp";

const baseUrl = import.meta.env.BASE_URL;

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true, element: <MultiplayerHomePage /> },
        { path: "passnplay", element: <PassNPlayHubPage /> },
        // Permanent redirect for shared links that pre-date the rename.
        { path: "legacy", element: <Navigate replace to="/passnplay" /> },
        { path: "name", element: <EnterNamePage /> },
        { path: "room/:code", element: <RoomPage /> },
        { path: "games/whowhatwhere", element: <WhoWhatWhereApp /> },
        { path: "games/hat", element: <HatGameApp /> },
        { path: "games/imposter", element: <ImposterApp /> },
      ],
    },
  ],
  { basename: baseUrl.replace(/\/$/, "") || "/" },
);
