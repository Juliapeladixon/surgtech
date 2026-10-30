import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DirectoryProvider } from "./context/DirectoryContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DirectoryProvider>
          <App />
        </DirectoryProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
