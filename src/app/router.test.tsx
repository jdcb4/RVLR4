import { act, cleanup, render, screen } from "@testing-library/react";
import { lazy } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RouteLoadingScreen } from "@/app/RouteLoadingScreen";
import { appRoutes } from "@/app/router";

describe("app routes", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => cleanup());

  it("provides an accessible route-loading status", () => {
    render(<RouteLoadingScreen />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading game…");
  });

  it.each([
    ["/passnplay", "RVLRY"],
    ["/name?intent=host&game=hat", "Your name"],
    ["/room/ABC123", "Session unavailable"],
    ["/games/whowhatwhere", "Who What Where"],
    ["/games/hat", "Hat Game"],
    ["/games/imposter", "Imposter"],
  ])("lazy-loads %s on direct navigation", async (path, heading) => {
    const memoryRouter = createMemoryRouter(appRoutes, { initialEntries: [path] });
    render(<RouterProvider router={memoryRouter} />);
    await act(() => vi.dynamicImportSettled());

    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  it("uses a name-oriented mobile keyboard on room entry", async () => {
    const memoryRouter = createMemoryRouter(appRoutes, {
      initialEntries: ["/name?intent=host&game=hat"],
    });
    render(<RouterProvider router={memoryRouter} />);
    await act(() => vi.dynamicImportSettled());

    const nameInput = await screen.findByLabelText("Display name");
    expect(nameInput).toHaveAttribute("autocomplete", "nickname");
    expect(nameInput).toHaveAttribute("autocapitalize", "words");
    expect(nameInput).toHaveAttribute("enterkeyhint", "go");
  });

  it("provides a home link for unknown routes", async () => {
    render(
      <RouterProvider
        router={createMemoryRouter(appRoutes, { initialEntries: ["/missing-page"] })}
      />,
    );
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });

  it.each(["render", "chunk"])(
    "recovers from a %s failure without exposing internals or clearing saves",
    async (failure) => {
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      function BrokenScreen(): never {
        throw new Error("PRIVATE_DEBUG_DETAIL");
      }
      const BrokenChunk = lazy(async () => {
        throw new Error("PRIVATE_CHUNK_DETAIL");
      });
      localStorage.setItem("existing-save", "keep me");
      try {
        const routes = [
          {
            ...appRoutes[0]!,
            index: false as const,
            children: [
              {
                path: "broken",
                element: failure === "render" ? <BrokenScreen /> : <BrokenChunk />,
              },
            ],
          },
        ];
        render(
          <RouterProvider router={createMemoryRouter(routes, { initialEntries: ["/broken"] })} />,
        );
        expect(
          await screen.findByRole("heading", { name: "This screen could not load" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to home" })).toBeInTheDocument();
        expect(screen.queryByText(/PRIVATE_/)).not.toBeInTheDocument();
        expect(localStorage.getItem("existing-save")).toBe("keep me");
      } finally {
        errorLog.mockRestore();
      }
    },
  );
});
