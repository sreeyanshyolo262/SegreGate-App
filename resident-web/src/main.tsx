import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startTilt, tuneForDevice } from "./motion";
import "./index.css";

tuneForDevice();
startTilt();
// iPhones only show pressed states if the page is listening for touches.
document.addEventListener("touchstart", () => {}, { passive: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// The launch screen fades away once the app has drawn its first frame.
requestAnimationFrame(() => requestAnimationFrame(() => {
  const splash = document.getElementById("splash");
  splash?.classList.add("gone");
  setTimeout(() => splash?.remove(), 350);
}));
