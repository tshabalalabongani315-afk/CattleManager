import { useEffect, useState } from "react";
import { Input, Button, Text, Stack, Heading } from "@chakra-ui/react";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { api } from "../api";

export default function DailyCounts() {
  const [count, setCount] = useState("");
  const [records, setRecords] = useState([]);

  const loadCounts = async () => {
    const res = await api.get("/daily-counts");
    setRecords(res.data);
  };

  const submit = async () => {
    if (!count) return;

    await api.post("/daily-counts", { count });

    setCount("");
    loadCounts();
  };

  useEffect(() => {
    loadCounts();
  }, []);

  return (
    <PageTransition>
      <Card>
        <Heading size="md" mb={4}>
          Daily Kraal Count
        </Heading>

        <Stack spacing="4">
          <Input
            type="number"
            placeholder="Number of cattle"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          <Button colorScheme="brand" onClick={submit} alignSelf="flex-start">
            Save Count
          </Button>

          <Stack spacing="1" pt={2}>
            {records.length === 0 && (
              <Text color="gray.500">No counts recorded yet.</Text>
            )}
            {records.map((r) => (
              <Text key={r.id}>
                {r.date}: {r.count} cattle
              </Text>
            ))}
          </Stack>
        </Stack>
      </Card>
    </PageTransition>
  );
}
