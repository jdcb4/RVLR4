import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  back: () => {},
  remove: vi.fn(),
  minimize: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn((_event: string, callback: () => void) => {
      native.back = callback;
      return Promise.resolve({ remove: native.remove });
    }),
    minimizeApp: native.minimize,
  },
}));

import { NativeNavigation } from "@/app/NativeNavigation";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Android Back", () => {
  it("allows the game to consume Back before any navigation", () => {
    render(
      <MemoryRouter>
        <NativeNavigation />
      </MemoryRouter>,
    );
    const consume = (event: Event) => event.preventDefault();
    window.addEventListener("rvlry:back", consume);
    try {
      act(() => native.back());
      expect(native.minimize).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("rvlry:back", consume);
    }
  });

  it("dismisses the top dialog before dispatching Back to the game", () => {
    const close = vi.fn();
    render(
      <MemoryRouter>
        <NativeNavigation />
        <dialog
          open
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
        >
          Details
        </dialog>
      </MemoryRouter>,
    );
    const gameBack = vi.fn();
    window.addEventListener("rvlry:back", gameBack);
    try {
      act(() => native.back());
      expect(close).toHaveBeenCalledOnce();
      expect(gameBack).not.toHaveBeenCalled();
      expect(native.minimize).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("rvlry:back", gameBack);
    }
  });
});
