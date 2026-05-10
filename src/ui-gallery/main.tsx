import "@/index.css";
import "@/themes/default.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { GalleryApp } from "@/ui-gallery/GalleryApp";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Gallery mount point "#root" is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <GalleryApp />
  </StrictMode>,
);
