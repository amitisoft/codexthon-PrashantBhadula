import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  return (
    <button
      aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={[
        "premium-button premium-button-secondary text-sm",
        className ?? "",
      ].join(" ")}
      onClick={toggleMode}
      type="button"
    >
      {mode === "dark" ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-primary" />}
      {mode === "dark" ? "Light" : "Dark"}
    </button>
  );
}
