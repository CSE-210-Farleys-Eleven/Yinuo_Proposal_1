import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DemoServicesProvider } from "./app/services";
import { MemoryNetwork } from "./adapters/memory";
import { ALICE, SEED_USERS, seedNetwork } from "./adapters/memory/seed";
import "./styles.css";

// Demo composition: sample data in memory. Reloading the page resets records;
// private notes and review progress persist in this browser's localStorage.
const network = new MemoryNetwork(SEED_USERS);
seedNetwork(network, new Date());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoServicesProvider network={network} initialUser={ALICE} storage={window.localStorage}>
      <App />
    </DemoServicesProvider>
  </StrictMode>,
);
