import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { StoreProvider } from "./ui/store";

createRoot(document.getElementById("root")!).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);
