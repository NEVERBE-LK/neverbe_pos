import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#000000",
            colorSuccess: "#10b981",
            colorError: "#ef4444",
            colorWarning: "#f59e0b",
            colorTextBase: "#0a0a0a",
            borderRadius: 14,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
          components: {
            Button: {
              borderRadius: 14,
              fontWeight: 700,
              controlHeight: 46,
            },
            Input: {
              borderRadius: 12,
              controlHeight: 46,
            },
            Select: {
              borderRadius: 12,
              controlHeight: 46,
            },
            Modal: {
              borderRadiusLG: 24,
            },
            Card: {
              borderRadiusLG: 20,
            },
            Table: {
              borderRadius: 16,
            },
          },
        }}
      >
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>,
);
