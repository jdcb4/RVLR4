import "./index.css";
import "./themes/default.css";
import "./themes/variants.css";
import "./themes/recess-materials.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { initializeApp } from "@/app/initializeApp";
import { router } from "@/app/router";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");

void initializeApp().then(() =>
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  ),
);
