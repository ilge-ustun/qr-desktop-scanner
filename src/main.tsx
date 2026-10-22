import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Bundled fonts (see fonts.css): the app never fetches fonts at runtime.
import "./fonts.css";

import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
