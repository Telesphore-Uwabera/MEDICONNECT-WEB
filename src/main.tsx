// import { createRoot } from "react-dom/client";
// import App from "./App.tsx";
// import "./index.css";
// import "./lib/i18n";

// createRoot(document.getElementById("root")!).render(<App />);


// import { createRoot } from "react-dom/client";
// import App from "./App.tsx";
// import "./index.css";
// import "./lib/i18n";
// import { ThemeProvider } from "./context/ThemeContext.tsx";

// createRoot(document.getElementById("root")!).render(
//   <ThemeProvider>
//     <App />
//   </ThemeProvider>
// );
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { FloatingCall } from "./components/FloatingCall.tsx";
import { CallStoreProvider } from "./context/CallStore.tsx";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <CallStoreProvider >
      <App />
      <FloatingCall />
    </CallStoreProvider>
  </ThemeProvider>
);
