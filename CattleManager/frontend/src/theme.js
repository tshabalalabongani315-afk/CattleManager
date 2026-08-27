import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: "gray.100",
        color: "gray.800",
        _dark: {
          bg: "gray.900",
          color: "gray.100",
        },
      },
    },
  },
});

export default theme;
