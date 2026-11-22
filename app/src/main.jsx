import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/heebo/400.css";
import "@fontsource/heebo/600.css";
import "@fontsource/heebo/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/ui.css";
import "./styles/entity.css";
import "./styles/models.css";
import "./styles/ai-models.css";
import "./styles/map-tools.css";
import "./styles/map-tools-set.css";
import App from "./App";
import { VesselSetProvider } from "./state/vesselSet";
createRoot(document.getElementById("root")).render(<StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <VesselSetProvider>
        <App />
      </VesselSetProvider>
    </BrowserRouter>
  </StrictMode>);
