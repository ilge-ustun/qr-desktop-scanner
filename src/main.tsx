import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Bundled, Latin subsets only: the app never fetches fonts at runtime.
import "@fontsource/wdxl-lubrifont-jp-n/latin-400.css";
import "@fontsource/wdxl-lubrifont-jp-n/latin-ext-400.css";
import "@fontsource/silkscreen/latin-400.css";
import "@fontsource/silkscreen/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-ext-500.css";

import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
