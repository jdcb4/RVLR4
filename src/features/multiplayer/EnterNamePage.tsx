import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GameShell } from "@/components/GameShell";
import { type AvatarId, isAvatarId, pickRandomAvatarId } from "@/multiplayer/avatarCatalog";
import { getMultiplayerDisplayNames } from "@/multiplayer/displayNames";
import { gameKindLabel } from "@/multiplayer/gameKindLabel";
import { persistSession } from "@/multiplayer/useRoomChannel";
import { localGameStorage } from "@/services/browserStorage";
import { requestHttp } from "@/services/networkRequests";

import { AvatarPicker } from "./AvatarPicker";
import { readRoomEntrySession, type RoomEntrySession } from "./roomEntryResponse";

type Intent = "host" | "join";

const LAST_NAME_KEY = "jd-multiplayer:last-display-name";
const LAST_AVATAR_KEY = "jd-multiplayer:last-avatar";

function pickRandomName(): string {
  const names = getMultiplayerDisplayNames();
  return names[Math.floor(Math.random() * names.length)] ?? "Player";
}

function loadLastName(): string {
  return (localGameStorage.read(LAST_NAME_KEY) ?? "").slice(0, 32);
}

function saveLastName(value: string): void {
  localGameStorage.write(LAST_NAME_KEY, value.slice(0, 32));
}

function loadLastAvatar(): AvatarId {
  const stored = localGameStorage.read(LAST_AVATAR_KEY);
  return isAvatarId(stored) ? stored : pickRandomAvatarId();
}

function saveLastAvatar(value: AvatarId): void {
  localGameStorage.write(LAST_AVATAR_KEY, value);
}

export function EnterNamePage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const submission = useRef<AbortController | null>(null);
  const [searchParams] = useSearchParams();
  const intent = searchParams.get("intent") as Intent | null;
  const joinCode = searchParams.get("code");
  const hostGame = searchParams.get("game");
  useEffect(() => () => submission.current?.abort(), [intent, joinCode, hostGame]);

  const [name, setName] = useState(() => loadLastName());
  const [avatarId, setAvatarId] = useState<AvatarId>(() => loadLastAvatar());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    hostName: string;
    gameKind: string;
    playerCount: number;
  } | null>(null);

  const heading = useMemo(() => {
    if (intent === "join") {
      return "Join this room";
    }

    if (intent === "host") {
      return "Host a room";
    }

    return "Continue";
  }, [intent]);

  useEffect(() => {
    if (intent !== "join" || !joinCode) {
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    void requestHttp(
      `/api/rooms/${encodeURIComponent(joinCode)}`,
      async (response) => {
        if (!response.ok) {
          throw new Error("That join code is not active.");
        }

        return response.json() as Promise<{
          exists?: boolean;
          hostName?: string;
          gameKind?: string;
          playerCount?: number;
        }>;
      },
      { signal: controller.signal },
    )
      .then((payload) => {
        if (cancelled || !payload.exists) {
          return;
        }

        setPreview({
          hostName: payload.hostName ?? "Host",
          gameKind: payload.gameKind ?? "game",
          playerCount: payload.playerCount ?? 0,
        });
      })
      .catch(() => {
        if (!cancelled)
          setError("Could not look up that join code. Check your connection and try again.");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [intent, joinCode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submission.current) return;
    setError(null);

    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setError("Pick a name with at least two letters.");

      return;
    }

    setLoading(true);
    const controller = new AbortController();
    submission.current = controller;

    try {
      const enterRoom = (session: RoomEntrySession) => {
        persistSession(session);
        saveLastName(trimmed);
        saveLastAvatar(avatarId);
        navigate(`/room/${session.code}`);
      };

      if (intent === "host") {
        if (!hostGame) {
          throw new Error("Missing game selection.");
        }

        const session = await requestHttp(
          "/api/rooms",
          (response) => readRoomEntrySession(response, "Unable to create a room."),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              gameKind: hostGame,
              hostName: trimmed,
              avatarId,
            }),
            signal: controller.signal,
          },
        );

        if (!controller.signal.aborted) enterRoom(session);
      } else if (intent === "join") {
        if (!joinCode) {
          throw new Error("Missing join code.");
        }

        const session = await requestHttp(
          `/api/rooms/${encodeURIComponent(joinCode)}/join`,
          (response) => readRoomEntrySession(response, "Unable to join this room."),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: trimmed, avatarId }),
            signal: controller.signal,
          },
        );

        if (!controller.signal.aborted) enterRoom(session);
      } else {
        throw new Error("Open this page from the home screen.");
      }
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      submission.current = null;
      setLoading(false);
    }
  };

  if (!intent || (intent === "join" && !joinCode) || (intent === "host" && !hostGame)) {
    return (
      <GameShell footer={null} title="Name">
        <p className="text-typ-body-relaxed text-muted-foreground">
          Start from the home page so we know whether you are hosting or joining.
        </p>
      </GameShell>
    );
  }

  return (
    <GameShell
      footer={
        <PrimaryFooterButton
          disabled={loading}
          label={loading ? "Working..." : intent === "host" ? "Host the game" : "Join the lobby"}
          onClick={() => formRef.current?.requestSubmit()}
        />
      }
      title="Your name"
    >
      <form
        className="flex flex-col gap-4"
        id="enter-name-form"
        ref={formRef}
        onSubmit={handleSubmit}
      >
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-typ-card-title font-semibold">{heading}</p>
          {intent === "host" ? (
            <p className="mt-2 text-typ-ui-snug text-muted-foreground">
              You are hosting{" "}
              <span className="font-semibold text-foreground">
                {gameKindLabel(hostGame ?? "this game")}
              </span>
              . Everyone else will use your join code after you reach the lobby.
            </p>
          ) : null}
          {intent === "join" && preview ? (
            <div className="mt-3 space-y-1 text-typ-ui-snug text-muted-foreground">
              <p>
                Game:{" "}
                <span className="font-semibold text-foreground">
                  {gameKindLabel(preview.gameKind)}
                </span>
              </p>
              <p>
                Host: <span className="font-semibold text-foreground">{preview.hostName}</span>
              </p>
              <p>
                Code:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {joinCode?.toUpperCase()}
                </span>
              </p>
              <p className="text-typ-ui text-muted-foreground">
                {preview.playerCount} player{preview.playerCount === 1 ? "" : "s"} already here.
              </p>
            </div>
          ) : null}
        </div>

        <label className="text-typ-ui font-medium" htmlFor="display-name">
          Display name
        </label>
        <input
          autoCapitalize="words"
          autoComplete="nickname"
          className="rounded-xl border border-input bg-background px-3 py-2 text-typ-body-relaxed outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          enterKeyHint="go"
          id="display-name"
          aria-describedby={error ? "entry-error" : undefined}
          inputMode="text"
          maxLength={32}
          placeholder="Name shown in the lobby"
          spellCheck={false}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <button
          className="rounded-xl border border-border px-4 py-2 text-typ-ui font-semibold text-foreground transition hover:bg-muted"
          type="button"
          onClick={() => setName(pickRandomName())}
        >
          Generate a random name
        </button>

        <AvatarPicker value={avatarId} onChange={setAvatarId} />

        {error ? (
          <p id="entry-error" role="alert" className="text-typ-ui text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </GameShell>
  );
}
