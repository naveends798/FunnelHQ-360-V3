import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

console.log("🚀 Starting application...");

createRoot(document.getElementById("root")!).render(<App />);