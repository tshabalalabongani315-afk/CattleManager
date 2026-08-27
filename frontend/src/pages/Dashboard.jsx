import { useEffect, useState } from "react";
import {
  SimpleGrid,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
} from "@chakra-ui/react";
import axios from "axios";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../api";

const MOVEMENT_COLOR = {
  IN: "green",
  OUT: "orange",
  SOLD: "blue",
  DIED: "red",
};

export default function Dashboard() {
  const [cattleCount, setCattleCount] = useState(null);
  const [latestCount, setLatestCount] = useState(null);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE}/cattle`).then((res) => setCattleCount(res.data.length));
    axios
      .get(`${API_BASE}/daily-counts`)
      .then((res) => setLatestCount(res.data[0] ?? null));
    axios.get(`${API_BASE}/movements`).then((res) => setMovements(res.data.slice(0, 5)));
  }, []);

  return (
    <PageTransition>
      <VStack align="stretch" spacing={6}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={5}>
          <StatCard label="Registered Cattle" value={cattleCount} />
          <StatCard
            label="Latest Kraal Count"
            value={latestCount?.count}
            hint={latestCount?.date}
          />
          <StatCard label="Recent Movements" value={movements.length} hint="last 5" />
        </SimpleGrid>

        <Card>
          <Heading size="md" mb={4}>
            Recent Activity
          </Heading>

          {movements.length === 0 ? (
            <Text color="gray.500">No movements logged yet.</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {movements.map((m) => (
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
