import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { AppInfoOverlay } from "./AppInfoOverlay";

afterEach(() => vi.unstubAllGlobals());

it("offers offline privacy information, support and locally bundled licences", async () => {
  const fetchLocal = vi
    .fn()
    .mockResolvedValue({ ok: true, text: async () => "Apache Cordova NOTICE" });
  vi.stubGlobal("fetch", fetchLocal);
  render(<AppInfoOverlay open onClose={() => {}} version="test" />);
  expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute(
    "href",
    "mailto:rvlry@jboxgames.com",
  );
  expect(screen.getByText(/RVLRY is intended for adults/)).toBeInTheDocument();
  expect(fetchLocal).not.toHaveBeenCalled();
  const details = screen.getByText("Open-source licences").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await waitFor(() => expect(screen.getByText("Apache Cordova NOTICE")).toBeInTheDocument());
  expect(fetchLocal).toHaveBeenCalledWith("/third-party-notices.txt");
});
