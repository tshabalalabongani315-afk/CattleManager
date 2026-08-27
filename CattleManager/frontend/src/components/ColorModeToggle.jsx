import { IconButton, useColorMode } from "@chakra-ui/react";

export default function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <IconButton
      size="sm"
      variant="ghost"
      onClick={toggleColorMode}
      aria-label="Toggle theme"
    >
      {colorMode === "light" ? "🌙" : "☀️"}
    </IconButton>
  );
}
