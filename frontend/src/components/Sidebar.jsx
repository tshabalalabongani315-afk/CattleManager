import { useEffect, useState } from "react";
import { Box, VStack, Text, Divider, Badge } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
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

const MotionBox = motion(Box);

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
      bg="rgba(15,20,19,0.72)"
      backdropFilter="blur(20px) saturate(150%)"
      borderRight="1px solid"
      borderColor="whiteAlpha.100"
      color="white"
      w="240px"
      minH="100vh"
      p={4}
      display="flex"
      flexDirection="column"
      position="sticky"
      top={0}
      alignSelf="flex-start"
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
        <MotionBox
          position="relative"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={3}
          py={2}
          rounded="md"
          cursor="pointer"
          bg="transparent"
          _hover={{ bg: isActive ? "transparent" : "whiteAlpha.100" }}
          whileHover={{ x: 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {isActive && (
            <MotionBox
              layoutId="sidebar-active-pill"
              position="absolute"
              inset={0}
              bg="brand.600"
              rounded="md"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
              style={{ zIndex: 0 }}
            />
          )}
          <Box
            position="relative"
            zIndex={1}
            display="flex"
            alignItems="center"
            gap={3}
          >
            {icon}
            <Text fontSize="sm">{label}</Text>
          </Box>
          {badge != null && (
            <Badge
              position="relative"
              zIndex={1}
              colorScheme="red"
              borderRadius="full"
              fontSize="10px"
              px={2}
            >
              {badge}
            </Badge>
          )}
        </MotionBox>
      )}
    </NavLink>
  );
}
