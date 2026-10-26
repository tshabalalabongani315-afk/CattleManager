import { IconButton, useColorMode } from "@chakra-ui/react";
import { FiMoon, FiSun } from "react-icons/fi";

export default function ColorModeToggle(props) {
  const { colorMode, toggleColorMode } = useColorMode();
  const next = colorMode === "light" ? "dark" : "light";

  return (
    <IconButton
      size="sm"
      variant="ghost"
      onClick={toggleColorMode}
      aria-label={`Switch to ${next} mode`}
      icon={colorMode === "light" ? <FiMoon /> : <FiSun />}
      {...props}
    />
  );
}
