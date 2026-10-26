import { useMemo } from "react";
import { Badge, Box, Button, Flex, Heading, HStack, Link, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FiActivity, FiBarChart2, FiCheckCircle, FiPlus, FiRepeat, FiUsers } from "react-icons/fi";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { dueStatus } from "../utils/vaccinations";
import { formatDate } from "../utils/dates";
import { BREED_COLORS } from "../utils/colors";

const MOVEMENT_COLOR = { IN: "green", OUT: "orange", SOLD: "blue", DIED: "red" };

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch("/dashboard");

  const due = useMemo(
    () =>
      (data?.vaccinationsDue ?? [])
        .map((v) => ({ ...v, status: dueStatus(v.next_due_date) }))
        .filter((v) => v.status),
    [data]
  );
  const overdue = due.filter((v) => v.status.label === "Overdue").length;

  const counted = data?.latestCount?.count ?? null;
  const diff = counted != null ? data.active - counted : null;

  const month = data?.monthMovements;
  const net = month ? month.IN - month.OUT - month.SOLD - month.DIED : null;

  const header = (
    <PageHeader
      title={`${greeting()}${user && !user.isDemo ? `, ${user.username}` : ""}`}
      description={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      actions={
        <>
          <Button as={RouterLink} to="/daily-counts" variant="subtle" leftIcon={<FiBarChart2 />}>
            Log count
          </Button>
          <Button as={RouterLink} to="/register?new=1" leftIcon={<FiPlus />}>
            Add animal
          </Button>
        </>
      }
    />
  );

  if (error && !data) {
    return (
      <PageTransition>
        {header}
        <Card>
          <ErrorState error={error} onRetry={reload} title="Couldn't load your dashboard" />
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {header}

      <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={{ base: 3, md: 4 }}>
        <StatCard
          label="Active animals"
          icon={FiUsers}
          loading={loading}
          value={data?.active}
          hint={data ? `${data.registered} on the register in total` : undefined}
        />
        <StatCard
          label="Latest kraal count"
          icon={FiBarChart2}
          tone="blue"
          loading={loading}
          value={counted}
          hint={data?.latestCount ? `Counted ${formatDate(data.latestCount.date)}` : "No count logged yet"}
        />
        <StatCard
          label="Vaccinations needing attention"
          icon={FiActivity}
          tone={overdue > 0 ? "red" : due.length > 0 ? "orange" : "brand"}
          loading={loading}
          value={due.length}
          hint={overdue > 0 ? `${overdue} overdue` : due.length > 0 ? "All due within 14 days" : "All up to date"}
        />
        <StatCard
          label="Net movement this month"
          icon={FiRepeat}
          tone="orange"
          loading={loading}
          value={net == null ? null : net > 0 ? `+${net}` : net}
          hint={month ? `${month.IN} in · ${month.OUT + month.SOLD} out · ${month.DIED} died` : undefined}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4} mt={4}>
        <Card gridColumn={{ lg: "span 2" }}>
          <SectionTitle title="Vaccinations due" action={<Link as={RouterLink} to="/vaccinations" color="brand.fg" fontSize="sm" fontWeight="600">View all</Link>} />
          {loading ? (
            <Stack spacing={3}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} h="44px" borderRadius="lg" />
              ))}
            </Stack>
          ) : due.length === 0 ? (
            <EmptyState
              icon={FiCheckCircle}
              title="You're all caught up"
              description="Nothing is overdue or due in the next two weeks."
            />
          ) : (
            <Stack spacing={0} divider={<Box borderTop="1px solid" borderColor="line" />}>
              {due.slice(0, 6).map((v) => (
                <Flex key={v.id} py={3} gap={3} align="center" justify="space-between">
                  <HStack spacing={3} minW={0}>
                    <Badge colorScheme={v.status.color} flexShrink={0}>
                      {v.status.label}
                    </Badge>
                    <Box minW={0}>
                      <Link as={RouterLink} to={`/cattle/${v.cattle_id}`} fontWeight="600" color="brand.fg">
                        {v.cattle_tag}
                      </Link>
                      <Text fontSize="sm" color="fg.muted" noOfLines={1}>
                        {v.vaccine_name}
                      </Text>
                    </Box>
                  </HStack>
                  <Text fontSize="sm" color="fg.muted" flexShrink={0}>
                    {formatDate(v.next_due_date)}
                  </Text>
                </Flex>
              ))}
            </Stack>
          )}
        </Card>

        <Card>
          <SectionTitle title="Herd reconciliation" action={<Link as={RouterLink} to="/herd" color="brand.fg" fontSize="sm" fontWeight="600">Details</Link>} />
          {loading ? (
            <Skeleton h="120px" borderRadius="lg" />
          ) : counted == null ? (
            <Text color="fg.muted" fontSize="sm">
              Log a daily count to compare it against your register.
            </Text>
          ) : (
            <Stack spacing={3}>
              <Row label="On the register" value={data.active} />
              <Row label="Counted in the kraal" value={counted} />
              <Box pt={1}>
                {diff === 0 ? (
                  <Badge colorScheme="green">All accounted for</Badge>
                ) : (
                  <Badge colorScheme="red">
                    {diff > 0 ? `${diff} unaccounted for` : `${-diff} over the register`}
                  </Badge>
                )}
              </Box>
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mt={4}>
        <Card>
          <SectionTitle title="Herd by breed" />
          {loading ? (
            <Skeleton h="160px" borderRadius="lg" />
          ) : data.breeds.length === 0 ? (
            <EmptyState
              icon={FiUsers}
              title="No animals yet"
              description="Add your first animal to see your herd's makeup."
              action={
                <Button as={RouterLink} to="/register?new=1" size="sm" leftIcon={<FiPlus />}>
                  Add animal
                </Button>
              }
            />
          ) : (
            <Flex align="center" gap={6} direction={{ base: "column", sm: "row" }}>
              <Box w="170px" h="170px" flexShrink={0} role="img" aria-label="Breed distribution chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.breeds} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                      {data.breeds.map((b, i) => (
                        <Cell key={b.name} fill={BREED_COLORS[i % BREED_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack spacing={2} w="full">
                {data.breeds.map((b, i) => (
                  <HStack key={b.name} justify="space-between">
                    <HStack spacing={2}>
                      <Box w="10px" h="10px" borderRadius="full" bg={BREED_COLORS[i % BREED_COLORS.length]} />
                      <Text fontSize="sm">{b.name}</Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="600">
                      {b.value}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            </Flex>
          )}
        </Card>

        <Card>
          <SectionTitle title="Recent activity" action={<Link as={RouterLink} to="/movements" color="brand.fg" fontSize="sm" fontWeight="600">All movements</Link>} />
          {loading ? (
            <Stack spacing={3}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} h="40px" borderRadius="lg" />
              ))}
            </Stack>
          ) : data.recentMovements.length === 0 ? (
            <EmptyState
              icon={FiRepeat}
              title="No movements logged"
              description="Record animals moving in, out, sold or died."
              action={
                <Button as={RouterLink} to="/movements" size="sm" variant="subtle">
                  Log a movement
                </Button>
              }
            />
          ) : (
            <Stack spacing={0} divider={<Box borderTop="1px solid" borderColor="line" />}>
              {data.recentMovements.map((m) => (
                <Flex key={m.id} py={3} gap={3} align="center" justify="space-between">
                  <HStack spacing={3} minW={0}>
                    <Badge colorScheme={MOVEMENT_COLOR[m.type] ?? "gray"} minW="52px" textAlign="center">
                      {m.type}
                    </Badge>
                    <Box minW={0}>
                      <Text fontSize="sm" fontWeight="600">
                        {m.quantity} {m.quantity === 1 ? "animal" : "animals"}
                      </Text>
                      {m.note && (
                        <Text fontSize="xs" color="fg.muted" noOfLines={1}>
                          {m.note}
                        </Text>
                      )}
                    </Box>
                  </HStack>
                  <Text fontSize="sm" color="fg.muted" flexShrink={0}>
                    {formatDate(m.date)}
                  </Text>
                </Flex>
              ))}
            </Stack>
          )}
        </Card>
      </SimpleGrid>
    </PageTransition>
  );
}

function SectionTitle({ title, action }) {
  return (
    <Flex justify="space-between" align="center" mb={4}>
      <Heading as="h2" size="sm">
        {title}
      </Heading>
      {action}
    </Flex>
  );
}

function Row({ label, value }) {
  return (
    <HStack justify="space-between">
      <Text fontSize="sm" color="fg.muted">
        {label}
      </Text>
      <Text fontWeight="700" fontSize="lg">
        {value}
      </Text>
    </HStack>
  );
}
