import { useEffect, useMemo, useState } from "react";
import {
  SimpleGrid,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Link,
  Button,
  Icon,
  Box,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FiList, FiBarChart2, FiRepeat, FiActivity } from "react-icons/fi";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { api } from "../api";
import { dueStatus } from "../utils/vaccinations";
import { BREED_COLORS } from "../utils/colors";
import { parseLocalDate } from "../utils/dates";

const MOVEMENT_COLOR = {
  IN: "green",
  OUT: "orange",
  SOLD: "blue",
  DIED: "red",
};

const QUICK_ACTIONS = [
  { to: "/register", icon: FiList, label: "Register Cattle" },
  { to: "/daily-counts", icon: FiBarChart2, label: "Log Daily Count" },
  { to: "/movements", icon: FiRepeat, label: "Log Movement" },
  { to: "/vaccinations", icon: FiActivity, label: "View Vaccinations" },
];

function isThisMonth(dateStr) {
  const d = parseLocalDate(dateStr);
  const today = new Date();
  return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

export default function Dashboard() {
  const [cattle, setCattle] = useState([]);
  const [latestCount, setLatestCount] = useState(null);
  const [movements, setMovements] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);

  useEffect(() => {
    api.get("/cattle").then((res) => setCattle(res.data));
    api.get("/daily-counts").then((res) => setLatestCount(res.data[0] ?? null));
    api.get("/movements").then((res) => setMovements(res.data));
    api.get("/vaccinations").then((res) => setVaccinations(res.data));
  }, []);

  const recentMovements = movements.slice(0, 5);

  const monthMovements = useMemo(
    () => movements.filter((m) => isThisMonth(m.date)),
    [movements]
  );

  const monthTotals = useMemo(() => {
    const totals = { IN: 0, OUT: 0, SOLD: 0, DIED: 0 };
    monthMovements.forEach((m) => {
      totals[m.type] = (totals[m.type] || 0) + Number(m.quantity);
    });
    return totals;
  }, [monthMovements]);

  const breedData = useMemo(() => {
    const grouped = {};
    cattle.forEach((c) => {
      grouped[c.breed] = (grouped[c.breed] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [cattle]);

  const dueVaccinations = vaccinations
    .map((v) => ({ ...v, status: dueStatus(v.next_due_date) }))
    .filter((v) => v.status);

  const registered = cattle.length;
  const counted = latestCount?.count != null ? Number(latestCount.count) : null;
  const reconciliationDiff = counted != null ? registered - counted : null;

  return (
    <PageTransition>
      <VStack align="stretch" spacing={6}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={5}>
          <StatCard label="Registered Cattle" value={registered} />
          <StatCard
            label="Latest Kraal Count"
            value={latestCount?.count}
            hint={latestCount?.date}
          />
          <StatCard label="Recent Movements" value={recentMovements.length} hint="last 5" />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
          <Card>
            <Heading size="sm" mb={4}>
              Quick Actions
            </Heading>
            <SimpleGrid columns={2} spacing={3}>
              {QUICK_ACTIONS.map((a) => (
                <Button
                  key={a.to}
                  as={RouterLink}
                  to={a.to}
                  variant="outline"
                  justifyContent="flex-start"
                  leftIcon={<Icon as={a.icon} />}
                  size="sm"
                >
                  {a.label}
                </Button>
              ))}
            </SimpleGrid>
          </Card>

          <Card>
            <HStack justify="space-between" mb={4}>
              <Heading size="sm">Herd Reconciliation</Heading>
              <Link as={RouterLink} to="/herd" fontSize="xs" color="brand.500">
                View details
              </Link>
            </HStack>

            {counted == null ? (
              <Text color="gray.500" fontSize="sm">
                No daily count recorded yet.
              </Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Text fontSize="sm">Registered</Text>
                  <Text fontWeight="bold">{registered}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Counted ({latestCount.date})</Text>
                  <Text fontWeight="bold">{counted}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Difference</Text>
                  {reconciliationDiff === 0 ? (
                    <Badge colorScheme="green">All accounted for</Badge>
                  ) : (
                    <Badge colorScheme="red">
                      {reconciliationDiff > 0
                        ? `${reconciliationDiff} unaccounted for`
                        : `${-reconciliationDiff} over register`}
                    </Badge>
                  )}
                </HStack>
              </VStack>
            )}
          </Card>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
          <Card>
            <Heading size="sm" mb={2}>
              Breed Distribution
            </Heading>
            {breedData.length === 0 ? (
              <Text color="gray.500" fontSize="sm">
                No cattle registered yet.
              </Text>
            ) : (
              <HStack spacing={4} align="center">
                <Box h="140px" w="140px" flexShrink={0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breedData} dataKey="value" nameKey="name" outerRadius={60}>
                        {breedData.map((_, i) => (
                          <Cell key={i} fill={BREED_COLORS[i % BREED_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <VStack align="stretch" spacing={1} fontSize="sm">
                  {breedData.map((b, i) => (
                    <HStack key={b.name}>
                      <Box
                        w="8px"
                        h="8px"
                        borderRadius="full"
                        bg={BREED_COLORS[i % BREED_COLORS.length]}
                      />
                      <Text>
                        {b.name} ({b.value})
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </HStack>
            )}
          </Card>

          <Card>
            <Heading size="sm" mb={4}>
              Movements This Month
            </Heading>
            <SimpleGrid columns={2} spacing={3}>
              {Object.entries(monthTotals).map(([type, total]) => (
                <HStack key={type} justify="space-between">
                  <Badge colorScheme={MOVEMENT_COLOR[type]}>{type}</Badge>
                  <Text fontWeight="bold">{total}</Text>
                </HStack>
              ))}
            </SimpleGrid>
          </Card>
        </SimpleGrid>

        <Card>
          <Heading size="md" mb={4}>
            Vaccinations Due
          </Heading>

          {dueVaccinations.length === 0 ? (
            <Text color="gray.500">Nothing due or overdue right now.</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {dueVaccinations.map((v) => (
                <HStack key={v.id} justify="space-between">
                  <HStack>
                    <Badge colorScheme={v.status.color}>{v.status.label}</Badge>
                    <Link as={RouterLink} to={`/cattle/${v.cattle_id}`} color="brand.500">
                      {v.cattle_tag}
                    </Link>
                    <Text color="gray.500" fontSize="sm">
                      {v.vaccine_name}
                    </Text>
                  </HStack>
                  <Text color="gray.500" fontSize="sm">
                    due {v.next_due_date}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Card>

        <Card>
          <Heading size="md" mb={4}>
            Recent Activity
          </Heading>

          {recentMovements.length === 0 ? (
            <Text color="gray.500">No movements logged yet.</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {recentMovements.map((m) => (
                <HStack key={m.id} justify="space-between">
                  <HStack>
                    <Badge colorScheme={MOVEMENT_COLOR[m.type] ?? "gray"}>
                      {m.type}
                    </Badge>
                    <Text>{m.quantity} cattle</Text>
                    {m.note && (
                      <Text color="gray.500" fontSize="sm">
                        &mdash; {m.note}
                      </Text>
                    )}
                  </HStack>
                  <Text color="gray.500" fontSize="sm">
                    {m.date}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Card>
      </VStack>
    </PageTransition>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <Card>
      <Text fontWeight="semibold" color="gray.500" fontSize="sm">
        {label}
      </Text>
      <Text fontSize="3xl" fontWeight="bold">
        {value ?? "—"}
      </Text>
      {hint && (
        <Text fontSize="xs" color="gray.500">
          {hint}
        </Text>
      )}
    </Card>
  );
}
