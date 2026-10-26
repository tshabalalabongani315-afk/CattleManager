import { extendTheme } from "@chakra-ui/react";

const FONT = "'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

const theme = extendTheme({
  config: {
    // Follow the visitor's OS preference until they pick one themselves.
    initialColorMode: "system",
    useSystemColorMode: false,
  },
  fonts: { heading: FONT, body: FONT },
  radii: { md: "8px", lg: "10px", xl: "14px", "2xl": "18px" },
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
  },
  // Semantic tokens keep light/dark in one place — components say `bg="surface"`.
  semanticTokens: {
    colors: {
      "app.bg": { default: "#F6F7F5", _dark: "#0D1210" },
      surface: { default: "#FFFFFF", _dark: "#151B18" },
      "surface.muted": { default: "#F1F3F0", _dark: "#1C2420" },
      line: { default: "#E3E7E1", _dark: "#27312B" },
      fg: { default: "#17201A", _dark: "#ECF0ED" },
      "fg.muted": { default: "#59635C", _dark: "#9AA59D" },
      "brand.fg": { default: "brand.600", _dark: "brand.300" },
    },
  },
  styles: {
    global: {
      body: { bg: "app.bg", color: "fg", lineHeight: "1.55" },
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: "brand" },
      baseStyle: { fontWeight: "600", borderRadius: "lg" },
      variants: {
        // Neutral outline used for secondary actions.
        subtle: {
          bg: "surface",
          border: "1px solid",
          borderColor: "line",
          color: "fg",
          _hover: { bg: "surface.muted" },
        },
      },
    },
    Input: { defaultProps: { focusBorderColor: "brand.500" } },
    Select: { defaultProps: { focusBorderColor: "brand.500" } },
    Textarea: { defaultProps: { focusBorderColor: "brand.500" } },
    FormLabel: { baseStyle: { fontSize: "sm", fontWeight: "600", mb: 1.5 } },
    Heading: { baseStyle: { letterSpacing: "-0.015em", fontWeight: "650" } },
    Badge: {
      baseStyle: { borderRadius: "full", px: 2.5, py: 0.5, textTransform: "none", fontWeight: "600" },
    },
    Table: {
      variants: {
        simple: {
          th: {
            color: "fg.muted",
            fontSize: "xs",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            borderColor: "line",
          },
          td: { borderColor: "line" },
        },
      },
    },
    Modal: { baseStyle: { dialog: { borderRadius: "2xl", bg: "surface" } } },
    Drawer: { baseStyle: { dialog: { bg: "surface" } } },
    Tabs: { defaultProps: { colorScheme: "brand" } },
    Switch: { defaultProps: { colorScheme: "brand" } },
  },
});

export default theme;
