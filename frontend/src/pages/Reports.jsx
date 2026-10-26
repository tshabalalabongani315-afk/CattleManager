import { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Flex, Heading, HStack, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react";
import { FiPieChart } from "react-icons/fi";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useFetch } from "../hooks/useFetch";
import { BREED_COLORS } from "../utils/colors";

function tally(rows, key, empty = "Not set") {
  const grouped = {};
  rows.forEach((r) => {
    const k = r[key] || empty;
    grouped[k] = (grouped[k] || 0) + 1;
  });
  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default function Reports() {
  const { data, loading, error, reload } = useFetch("/cattle");
  const cattle = useMemo(() => data ?? [], [data]);

  const breeds = useMemo(() => tally(cattle, "breed"), [cattle]);
  const sexes = useMemo(() => tally(cattle, "sex"), [cattle]);
  const statuses = useMemo(() => tally(cattle, "status"), [cattle]);

  return (
    <PageTransition>
      <PageHeader title="Reports" description="A snapshot of how your herd breaks down by breed, sex and status." />

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      ) : loading ? (
        <Skeleton h="320px" borderRadius="xl" />
      ) : cattle.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiPieChart}
            title="Nothing to report yet"
            description="Reports appear once animals are on your register."
            action={
              <Button as={RouterLink} to="/register?new=1" size="sm">
                Add an animal
              </Button>
            }
          />
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          <Card gridColumn={{ lg: "span 2" }}>
            <Heading as="h2" size="sm" mb={4}>
              Breed distribution
            </Heading>
            <Flex gap={8} align="center" direction={{ base: "column", sm: "row" }}>
              <Box w="220px" h="220px" flexShrink={0} role="img" aria-label="Breed distribution chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breeds} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={2} stroke="none">
                      {breeds.map((b, i) => (
                        <Cell key={b.name} fill={BREED_COLORS[i % BREED_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack spacing={3} w="full">
                {breeds.map((b, i) => (
                  <Bar key={b.name} label={b.name} value={b.value} total={cattle.length} color={BREED_COLORS[i % BREED_COLORS.length]} />
                ))}
              </Stack>
            </Flex>
          </Card>

          <Card>
            <Heading as="h2" size="sm" mb={4}>
              By sex
            </Heading>
            <Stack spacing={3}>
              {sexes.map((s, i) => (
                <Bar key={s.name} label={s.name} value={s.value} total={cattle.length} color={BREED_COLORS[i % BREED_COLORS.length]} />
              ))}
            </Stack>
          </Card>

          <Card>
            <Heading as="h2" size="sm" mb={4}>
              By status
            </Heading>
            <Stack spacing={3}>
              {statuses.map((s, i) => (
                <Bar key={s.name} label={s.name} value={s.value} total={cattle.length} color={BREED_COLORS[i % BREED_COLORS.length]} />
              ))}
            </Stack>
          </Card>
        </SimpleGrid>
      )}
    </PageTransition>
  );
}

function Bar({ label, value, total, color }) {
  const pct = Math.round((value / total) * 100);
  return (
    <Box>
      <HStack justify="space-between" mb={1}>
        <Text fontSize="sm" fontWeight="500">
          {label}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {value} · {pct}%
        </Text>
      </HStack>
      <Box h="8px" borderRadius="full" bg="surface.muted" overflow="hidden">
        <Box h="full" w={`${pct}%`} bg={color} borderRadius="full" />
      </Box>
    </Box>
  );
}
