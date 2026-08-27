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
  "/vaccinations": "Vaccinations",
  "/reports": "Reports",
  "/herd": "Herd Status",
  "/settings": "Settings",
};

function pageTitle(pathname) {
  if (pathname.startsWith("/cattle/")) return "Animal Profile";
  return PAGE_TITLES[pathname] ?? "Cattle Manager";
}

const AMBIENT_LIGHT =
  "radial-gradient(1100px circle at 8% -10%, rgba(63,125,87,0.10), transparent 55%)," +
  "radial-gradient(900px circle at 100% 10%, rgba(176,134,66,0.08), transparent 50%)," +
  "#F7F8F7";

const AMBIENT_DARK =
  "radial-gradient(1100px circle at 8% -10%, rgba(94,156,115,0.14), transparent 55%)," +
  "radial-gradient(900px circle at 100% 15%, rgba(94,124,138,0.10), transparent 50%)," +
  "#0F1413";

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Flex minH="100vh" background={AMBIENT_LIGHT} _dark={{ background: AMBIENT_DARK }}>
      <Sidebar />

      <Box ref={scrollRef} flex="1" overflowY="auto" position="relative">
        <HStack
          justify="space-between"
          px={8}
          py={5}
          position="sticky"
          top={0}
          zIndex={10}
          bg="rgba(247,248,247,0.7)"
          _dark={{ bg: "rgba(15,20,19,0.6)", borderColor: "whiteAlpha.100" }}
          backdropFilter="blur(14px) saturate(160%)"
          borderBottom="1px solid"
          borderColor="blackAlpha.100"
        >
          <Heading size="md">{pageTitle(pathname)}</Heading>
          <ColorModeToggle />
        </HStack>

        <Box px={8} py={6}>
          {children}
        </Box>
      </Box>
    </Flex>
  );
}
