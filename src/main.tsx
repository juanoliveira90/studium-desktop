import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/* bundled JetBrains Mono so the UI doesn't depend on system fonts */
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
