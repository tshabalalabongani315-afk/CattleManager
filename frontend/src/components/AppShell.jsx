import { useEffect, useRef } from "react";
import { Flex, Box, Heading, HStack } from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import ColorModeToggle from "./ColorModeToggle";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/register": "Register",
  "/daily-counts": "Daily Counts",
  "/movements": "Movements",
  "/reports": "Reports",
  "/herd": "Herd Status",
  "/settings": "Settings",
};

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Flex minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }}>
      <Sidebar />

      <Box ref={scrollRef} flex="1" overflowY="auto">
        <HStack
          justify="space-between"
          px={8}
          py={5}
          borderBottom="1px solid"
          borderColor="blackAlpha.100"
          _dark={{ borderColor: "whiteAlpha.100" }}
        >
          <Heading size="md">{PAGE_TITLES[pathname] ?? "Cattle Manager"}</Heading>
          <ColorModeToggle />
        </HStack>

        <Box px={8} py={6}>
          {children}
        </Box>
      </Box>
    </Flex>
  );
}
