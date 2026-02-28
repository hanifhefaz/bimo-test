import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set theme from localStorage if available, otherwise default to Bimo
const _preferred = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
const _valid = ["bimo", "warm", "midnight", "lavender", "forest", "sunset", "ocean", "charcoal", "plum", "sage", "taupe"];
const _theme = _preferred && _valid.includes(_preferred) ? _preferred : "bimo";
document.documentElement.setAttribute("data-theme", _theme);

createRoot(document.getElementById("root")!).render(<App />);
