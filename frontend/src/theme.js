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
    md: "8px",
    lg: "10px",
    xl: "12px",
    "2xl": "14px",
  },
  colors: {
    brand: {
      50: "#EFF6F1",
      100: "#D7E8DC",
      200: "#B0D1BA",
      300: "#86B896",
      400: "#5E9C73",
      500: "#3F7D57",
      600: "#2F6244",
      700: "#234A34",
      800: "#193425",
      900: "#101F17",
    },
    ink: {
      50: "#F4F5F4",
      100: "#E3E5E3",
      200: "#C3C7C4",
      300: "#8E958F",
      400: "#5E655F",
      500: "#3C433D",
      600: "#2A302B",
      700: "#1F2521",
      800: "#161B18",
      900: "#0F1413",
    },
  },
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
        _dark: {
          bg: "ink.800",
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
