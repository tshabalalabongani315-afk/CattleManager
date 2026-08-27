import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  radii: {
    md: "10px",
    lg: "14px",
    xl: "18px",
    "2xl": "22px",
  },
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
        _dark: {
          bg: "gray.900",
          color: "gray.100",
        },
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "600",
        borderRadius: "lg",
      },
    },
  },
});

export default theme;
