import { useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import { createSharedStyles } from "./helpers";

export const useThemeStyles = () => {
  const { colors, dark } = useTheme();

  return useMemo(() => {
    return {
      colors,
      dark,
      ...createSharedStyles(colors),
    };
  }, [colors, dark]);
};
