import "@fontsource-variable/inter";
import "./index.css";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ConfirmProvider from "./components/ui/ConfirmProvider";
import theme from "./theme";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ChakraProvider theme={theme}>
    <ConfirmProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfirmProvider>
  </ChakraProvider>
);
