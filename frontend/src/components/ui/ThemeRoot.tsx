import type { ReactNode } from "react";
import { useEffect } from "react";
import { applyTheme, useThemeStore } from "@/store/themeStore";

type ThemeRootProps = {
  children: ReactNode;
};

export function ThemeRoot({ children }: ThemeRootProps) {
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  return <>{children}</>;
}
