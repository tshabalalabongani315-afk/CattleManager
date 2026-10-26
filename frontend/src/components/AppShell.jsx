import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import Sidebar from "./Sidebar";
import Logo from "./Logo";
import ColorModeToggle from "./ColorModeToggle";
import { useAuth } from "../context/AuthContext";

const TITLES = {
  "/dashboard": "Dashboard",
  "/register": "Register",
  "/daily-counts": "Daily counts",
  "/movements": "Movements",
  "/vaccinations": "Vaccinations",
  "/reports": "Reports",
  "/herd": "Herd status",
  "/settings": "Settings",
};

const SIDEBAR_WIDTH = "256px";

function titleFor(pathname) {
  if (pathname.startsWith("/cattle/")) return "Animal profile";
  return TITLES[pathname] ?? "Cattle Manager";
}

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const drawer = useDisclosure();

  // Per-route document title + scroll reset (screen readers announce the change).
  useEffect(() => {
    document.title = `${titleFor(pathname)} · Cattle Manager`;
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Flex minH="100vh" bg="app.bg">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Desktop: fixed sidebar */}
      <Box
        display={{ base: "none", lg: "block" }}
        w={SIDEBAR_WIDTH}
        flexShrink={0}
        position="sticky"
        top={0}
        h="100vh"
        bg="surface"
        borderRight="1px solid"
        borderColor="line"
      >
        <Sidebar />
      </Box>

      {/* Mobile / tablet: slide-over drawer */}
      <Drawer isOpen={drawer.isOpen} onClose={drawer.onClose} placement="left">
        <DrawerOverlay />
        <DrawerContent maxW={SIDEBAR_WIDTH}>
          <DrawerBody p={0}>
            <Sidebar onNavigate={drawer.onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Flex direction="column" flex="1" minW={0}>
        <HStack
          as="header"
          justify="space-between"
          px={{ base: 4, md: 8 }}
          h="56px"
          position="sticky"
          top={0}
          zIndex={10}
          bg="surface"
          borderBottom="1px solid"
          borderColor="line"
          display={{ base: "flex", lg: "none" }}
        >
          <HStack spacing={3}>
            <IconButton
              aria-label="Open menu"
              icon={<FiMenu />}
              variant="ghost"
              onClick={drawer.onOpen}
            />
            <Logo size={22} textProps={{ fontSize: "sm" }} />
          </HStack>
          <ColorModeToggle />
        </HStack>

        {user?.isDemo && <DemoBanner expiresAt={user.expiresAt} />}

        <Box as="main" id="main" tabIndex={-1} flex="1" px={{ base: 4, md: 8 }} py={{ base: 5, md: 8 }}>
          <Box maxW="1180px" mx="auto">
            {children}
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}

function DemoBanner({ expiresAt }) {
  const [now] = useState(() => Date.now());
  const hours = expiresAt ? Math.max(1, Math.round((new Date(expiresAt) - now) / 3_600_000)) : null;

  return (
    <Flex
      bg="brand.600"
      color="white"
      px={{ base: 4, md: 8 }}
      py={2}
      gap={3}
      align="center"
      justify="space-between"
      wrap="wrap"
    >
      <Text fontSize="sm">
        <strong>Demo sandbox</strong> — sample data only, private to you
        {hours ? `, cleared in ~${hours}h` : ""}.
      </Text>
      <Button as={RouterLink} to="/signup" size="xs" bg="white" color="brand.700" _hover={{ bg: "brand.50" }}>
        Create a real account
      </Button>
    </Flex>
  );
}
