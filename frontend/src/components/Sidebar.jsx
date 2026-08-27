import { useEffect, useState } from "react";
import { Box, VStack, Text, Divider, Badge } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import {
  FiHome,
  FiList,
  FiBarChart2,
  FiRepeat,
  FiActivity,
  FiClipboard,
  FiUsers,
  FiSettings,
} from "react-icons/fi";
import Logo from "./Logo";
import { API_BASE } from "../api";

function countOverdue(records) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return records.filter((r) => r.next_due_date && new Date(r.next_due_date) < today).length;
}

export default function Sidebar() {
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    axios
      .get(`${API_BASE}/vaccinations`)
      .then((res) => setOverdueCount(countOverdue(res.data)))
      .catch(() => {});
  }, []);

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
        <NavItem
          to="/vaccinations"
          icon={<FiActivity />}
          label="Vaccinations"
          badge={overdueCount > 0 ? overdueCount : null}
        />

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

function NavItem({ to, icon, label, badge }) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={3}
          py={2}
          rounded="md"
          bg={isActive ? "brand.600" : "transparent"}
          _hover={{ bg: isActive ? "brand.600" : "whiteAlpha.100" }}
          transition="background 0.15s ease"
        >
          <Box display="flex" alignItems="center" gap={3}>
            {icon}
            <Text fontSize="sm">{label}</Text>
          </Box>
          {badge != null && (
            <Badge colorScheme="red" borderRadius="full" fontSize="10px" px={2}>
              {badge}
            </Badge>
          )}
        </Box>
      )}
    </NavLink>
  );
}
