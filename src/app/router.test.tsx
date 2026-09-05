import { act, cleanup, render, screen } from "@testing-library/react";
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
    ["/room/ABC123", "Reconnect"],
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
});
