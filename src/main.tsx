
// import { createRoot } from "react-dom/client";
// import App from "./App.tsx";
// import "./index.css";
// import "./lib/i18n";
// import { ThemeProvider } from "./context/ThemeContext.tsx";
// import { FloatingCall } from "./components/FloatingCall.tsx";
// import { CallStoreProvider } from "./context/CallStore.tsx";
// import { QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
// import { queryClient } from "@/lib/query-client";

// createRoot(document.getElementById("root")!).render(
//   <ThemeProvider>
//     <CallStoreProvider >
//       <App />
//       <FloatingCall />
//     </CallStoreProvider>
//   </ThemeProvider>
// );
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { FloatingCall } from "./components/FloatingCall.tsx";
import { CallStoreProvider } from "./context/CallStore.tsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/query-client";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <CallStoreProvider>
        <App />
        <FloatingCall />
      </CallStoreProvider>
    </ThemeProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
