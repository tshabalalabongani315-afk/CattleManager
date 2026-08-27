import { Flex, Box } from "@chakra-ui/react";
import Sidebar from "./sidebar_temp";

export default function AppShell({ children }) {
  return (
    <Flex h="100vh" bg="gray.100">
      <Sidebar />

      <Box
        flex="1"
        overflowY="auto"
        px="8"
        py="6"
      >
        {children}
      </Box>
    </Flex>
  );
}
