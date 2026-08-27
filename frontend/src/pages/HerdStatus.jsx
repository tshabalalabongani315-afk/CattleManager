import { useEffect, useState } from "react";
import { Heading, Text, HStack, VStack, Badge } from "@chakra-ui/react";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { api } from "../api";

export default function HerdStatus() {
  const [registered, setRegistered] = useState(null);
  const [latestCount, setLatestCount] = useState(null);

  useEffect(() => {
    api.get("/cattle").then((res) => setRegistered(res.data.length));
    api.get("/daily-counts").then((res) => setLatestCount(res.data[0] ?? null));
  }, []);

  const loading = registered === null || latestCount === undefined;
  const counted = latestCount?.count;
  const diff = registered != null && counted != null ? registered - Number(counted) : null;

  return (
    <PageTransition>
      <Card maxW="480px">
        <Heading size="md" mb={4}>
          Herd Reconciliation
        </Heading>

        {loading ? (
          <Text color="gray.500">Loading…</Text>
        ) : !latestCount ? (
          <Text color="gray.500">
            No daily count recorded yet — log one on the Daily Counts page to
            reconcile against your register.
          </Text>
        ) : (
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <Text>Registered</Text>
              <Text fontWeight="bold">{registered}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text>Counted ({latestCount.date})</Text>
              <Text fontWeight="bold">{counted}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text>Difference</Text>
              {diff === 0 ? (
                <Badge colorScheme="green">All accounted for</Badge>
              ) : (
                <Badge colorScheme="red">
                  {diff > 0 ? `${diff} unaccounted for` : `${-diff} over register`}
                </Badge>
              )}
            </HStack>
          </VStack>
        )}
      </Card>
    </PageTransition>
  );
}
