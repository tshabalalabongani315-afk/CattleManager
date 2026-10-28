import { useCallback, useEffect, useState } from "react";
import { Badge, Box, Divider, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiList,
  FiBarChart2,
  FiRepeat,
  FiActivity,
  FiPieChart,
  FiCheckSquare,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import Logo from "./Logo";
import ColorModeToggle from "./ColorModeToggle";
import { api, DATA_CHANGED_EVENT } from "../api";
import { useAuth } from "../context/AuthContext";
import { dueStatus } from "../utils/vaccinations";
import { useConfirm } from "../hooks/confirmContext";
import { useSyncStatus } from "../hooks/useSyncStatus";
import InstallButton from "./InstallButton";

const NAV = [
  {
    heading: "Farm",
    items: [
      { to: "/dashboard", icon: FiHome, label: "Dashboard" },
      { to: "/register", icon: FiList, label: "Register" },
      { to: "/daily-counts", icon: FiBarChart2, label: "Daily counts" },
      { to: "/movements", icon: FiRepeat, label: "Movements" },
      { to: "/vaccinations", icon: FiActivity, label: "Vaccinations", badgeKey: "vaccinations" },
    ],
  },
  {
    heading: "Insights",
    items: [
      { to: "/herd", icon: FiCheckSquare, label: "Herd status" },
      { to: "/reports", icon: FiPieChart, label: "Reports" },
    ],
  },
  { heading: "Account", items: [{ to: "/settings", icon: FiSettings, label: "Settings" }] },
];

/** Count of vaccinations that are overdue or due soon, kept fresh after any write. */
function useAttentionCount() {
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    api
      .get("/vaccinations")
      .then((res) => setCount(res.data.filter((r) => dueStatus(r.next_due_date)).length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(DATA_CHANGED_EVENT, load);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, load);
  }, [load]);

  return count;
}

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const attention = useAttentionCount();
  const { pending } = useSyncStatus();

  const handleLogout = async () => {
    if (pending > 0) {
      const ok = await confirm({
        title: "Sign out with changes waiting?",
        body: `${pending} ${pending === 1 ? "change is" : "changes are"} saved on this device but haven't uploaded yet. They stay here and upload the next time you sign in on this device.`,
        confirmLabel: "Sign out anyway",
        danger: true,
      });
      if (!ok) return;
    }
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <VStack as="nav" aria-label="Main" align="stretch" spacing={0} h="full" p={4}>
      <Box px={2} pt={1} pb={5}>
        <Logo size={26} textProps={{ fontSize: "md" }} />
      </Box>

      <VStack align="stretch" spacing={5} flex="1" overflowY="auto">
        {NAV.map((group) => (
          <VStack key={group.heading} align="stretch" spacing={0.5}>
            <Text
              px={3}
              mb={1}
              fontSize="11px"
              fontWeight="600"
              letterSpacing="0.06em"
              textTransform="uppercase"
              color="fg.muted"
            >
              {group.heading}
            </Text>
            {group.items.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                badge={item.badgeKey === "vaccinations" && attention > 0 ? attention : null}
                onNavigate={onNavigate}
              />
            ))}
          </VStack>
        ))}
      </VStack>

      <Divider my={3} borderColor="line" />

      <VStack align="stretch" spacing={1}>
        {user && (
          <Box px={3} py={1}>
            <Text fontSize="sm" fontWeight="600" noOfLines={1}>
              {user.username}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {user.isDemo ? "Demo sandbox" : "Owner"}
            </Text>
          </Box>
        )}
        <InstallButton />
        <HStack justify="space-between">
          <HStack
            as="button"
            type="button"
            onClick={handleLogout}
            spacing={3}
            px={3}
            py={2}
            borderRadius="lg"
            color="fg.muted"
            _hover={{ bg: "surface.muted", color: "fg" }}
            transition="background 0.15s ease"
          >
            <Icon as={FiLogOut} />
            <Text fontSize="sm" fontWeight="500">
              Sign out
            </Text>
          </HStack>
          <ColorModeToggle />
        </HStack>
      </VStack>
    </VStack>
  );
}

function NavItem({ to, icon, label, badge, onNavigate }) {
  return (
    <NavLink to={to} onClick={onNavigate} style={{ display: "block" }}>
      {({ isActive }) => (
        <HStack
          justify="space-between"
          px={3}
          py={2}
          borderRadius="lg"
          bg={isActive ? "brand.50" : "transparent"}
          color={isActive ? "brand.700" : "fg"}
          _dark={{ bg: isActive ? "whiteAlpha.100" : "transparent", color: isActive ? "brand.200" : "fg" }}
          _hover={{ bg: isActive ? undefined : "surface.muted" }}
          transition="background 0.15s ease"
          aria-current={isActive ? "page" : undefined}
        >
          <HStack spacing={3}>
            <Icon as={icon} boxSize={4} />
            <Text fontSize="sm" fontWeight={isActive ? "650" : "500"}>
              {label}
            </Text>
          </HStack>
          {badge != null && (
            <Badge colorScheme="red" fontSize="10px" aria-label={`${badge} need attention`}>
              {badge}
            </Badge>
          )}
        </HStack>
      )}
    </NavLink>
  );
}
