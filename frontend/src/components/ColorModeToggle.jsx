import { IconButton, useColorMode } from "@chakra-ui/react";
import { FiMoon, FiSun } from "react-icons/fi";

export default function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <IconButton
      size="sm"
      variant="ghost"
      onClick={toggleColorMode}
      aria-label="Toggle theme"
      icon={colorMode === "light" ? <FiMoon /> : <FiSun />}
    />
  );
}
