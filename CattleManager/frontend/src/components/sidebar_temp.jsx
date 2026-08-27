import { Box, VStack, Text, Divider } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiList,
  FiBarChart2,
  FiClipboard,
  FiUsers,
  FiSettings,
  FiHelpCircle,
} from "react-icons/fi";
import ColorModeToggle from "./ColorModeToggle";

export default function Sidebar({ isOpen }) {
  return (
    <Box
      bg="gray.900"
      color="white"
      w={isOpen ? "240px" : "70px"}
      transition="width 0.25s ease"
      minH="100vh"
      p={4}
      _dark={{ bg: "gray.800" }}
    >
      <VStack spacing={4} align={isOpen ? "flex-start" : "center"}>
        <Text fontWeight="bold" fontSize="lg">
          {isOpen ? "BMA Cattle Manager" : "BMA"}
        </Text>

        <Section title="MAIN" isOpen={isOpen} />
        <NavItem to="/" icon={<FiHome />} label="Dashboard" isOpen={isOpen} />
        <NavItem to="/register" icon={<FiList />} label="Register" isOpen={isOpen} />
        <NavItem
          to="/daily-counts"
          icon={<FiBarChart2 />}
          label="Daily Counts"
          isOpen={isOpen}
        />

        <Divider />

        <Section title="MANAGE" isOpen={isOpen} />
        <NavItem to="/reports" icon={<FiClipboard />} label="Reports" isOpen={isOpen} />
        <NavItem to="/herd" icon={<FiUsers />} label="Herd Summary" isOpen={isOpen} />

        <Divider />

        <Section title="SYSTEM" isOpen={isOpen} />
        <NavItem to="/settings" icon={<FiSettings />} label="Settings" isOpen={isOpen} />
        <NavItem to="/help" icon={<FiHelpCircle />} label="Help" isOpen={isOpen} />
      </VStack>

      <VStack justify="space-between" px={4} py={3}>
        <Text fontWeight="bold">BMA Cattle Manager</Text>
        <ColorModeToggle />
      </VStack>
      
    </Box>
  );
}

function Section({ title, isOpen }) {
  if (!isOpen) return null;
  return (
    <Text fontSize="xs" color="gray.400" mt={4}>
      {title}
    </Text>
  );
}

function NavItem({ to, icon, label, isOpen }) {
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
          bg={isActive ? "green.500" : "transparent"}
          _hover={{ bg: "green.600" }}
          w="100%"
        >
          {icon}
          {isOpen && <Text>{label}</Text>}
        </Box>
      )}
    </NavLink>
  );
}
