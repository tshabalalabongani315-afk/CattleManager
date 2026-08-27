import { useEffect, useState } from "react";
import { Input, Button, Text, Stack } from "@chakra-ui/react";
import Card from "../components/Card";
import TopBar from "../components/TopBar";

const API = "http://localhost:4000";

export default function DailyCounts() {
  const [count, setCount] = useState("");
  const [records, setRecords] = useState([]);

  const loadCounts = async () => {
    const res = await fetch(`${API}/daily-counts`);
    setRecords(await res.json());
  };

  const submit = async () => {
    if (!count) return;

    await fetch(`${API}/daily-counts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });

    setCount("");
    loadCounts();
  };

  useEffect(() => {
    loadCounts();
  }, []);

  return (
    <>
      <TopBar title="Daily Kraal Count" />

      <Card>
        <Stack spacing="4">
          <Input
            type="number"
            placeholder="Number of cattle"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          <Button colorScheme="blue" onClick={submit}>
            Save Count
          </Button>

          {records.map((r) => (
            <Text key={r.id}>
              {r.date}: {r.count} cattle
            </Text>
          ))}
        </Stack>
      </Card>
    </>
  );
}
