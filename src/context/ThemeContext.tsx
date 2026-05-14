import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemTheme = (): "dark" | "light" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("mediconnect-theme") as Theme) || "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(
    typeof window !== "undefined" ? getSystemTheme() : "light"
  );

  const apply = (t: Theme) => {
    const root = window.document.documentElement;
    const active = t === "system" ? getSystemTheme() : t;
    
    root.classList.remove("dark", "light");
    root.classList.add(active);
    setResolvedTheme(active);
  };

  useEffect(() => {
    apply(theme);
    const listener = (e: MediaQueryListEvent) => {
      if (theme === "system") apply("system");
    };
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", listener);
    return () => window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", listener);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem("mediconnect-theme", t);
    setThemeState(t);
    apply(t);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
