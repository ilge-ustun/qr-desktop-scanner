import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Bundled, Latin subsets only: the app never fetches fonts at runtime.
import "@fontsource/silkscreen/latin-400.css";
import "@fontsource/silkscreen/latin-700.css";
import "@fontsource/sometype-mono/latin-400.css";
import "@fontsource/sometype-mono/latin-ext-400.css";
import "@fontsource/sometype-mono/latin-600.css";
import "@fontsource/sometype-mono/latin-ext-600.css";

import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
