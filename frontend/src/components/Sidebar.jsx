import { Box, VStack, Text, Divider } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiList,
  FiBarChart2,
  FiRepeat,
  FiClipboard,
  FiUsers,
  FiSettings,
} from "react-icons/fi";
import Logo from "./Logo";

export default function Sidebar() {
  return (
    <Box
      bg="ink.900"
      color="white"
      w="240px"
      minH="100vh"
      p={4}
      display="flex"
      flexDirection="column"
    >
      <Box px={1} mb={4}>
        <Logo size={20} markColor="#5E9C73" textProps={{ fontSize: "md" }} />
      </Box>

      <VStack spacing={1} align="stretch" flex="1">
        <Section title="MAIN" />
        <NavItem to="/dashboard" icon={<FiHome />} label="Dashboard" />
        <NavItem to="/register" icon={<FiList />} label="Register" />
        <NavItem to="/daily-counts" icon={<FiBarChart2 />} label="Daily Counts" />
        <NavItem to="/movements" icon={<FiRepeat />} label="Movements" />

        <Divider my={3} borderColor="whiteAlpha.200" />

        <Section title="MANAGE" />
        <NavItem to="/reports" icon={<FiClipboard />} label="Reports" />
        <NavItem to="/herd" icon={<FiUsers />} label="Herd Status" />

        <Divider my={3} borderColor="whiteAlpha.200" />

        <Section title="SYSTEM" />
        <NavItem to="/settings" icon={<FiSettings />} label="Settings" />
      </VStack>
    </Box>
  );
}

function Section({ title }) {
  return (
    <Text fontSize="xs" color="whiteAlpha.500" mt={2} mb={1} px={3} letterSpacing="wide">
      {title}
    </Text>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <Box
          display="flex"
          alignItems="center"
          gap={3}
          px={3}
          py={2}
          rounded="md"
          bg={isActive ? "brand.600" : "transparent"}
          _hover={{ bg: isActive ? "brand.600" : "whiteAlpha.100" }}
          transition="background 0.15s ease"
        >
          {icon}
          <Text fontSize="sm">{label}</Text>
        </Box>
      )}
    </NavLink>
  );
}
