import { useEffect, useState } from "react";
import {
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
} from "@chakra-ui/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { api } from "../api";

export default function WeightHistory({ cattleId }) {
  const [records, setRecords] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");

  const load = () => {
    api.get("/weights", { params: { cattle_id: cattleId } }).then((res) => setRecords(res.data));
  };

  useEffect(() => {
    load();
  }, [cattleId]);

  const save = async () => {
    if (!weight) return alert("Enter a weight");

    await api.post("/weights", {
      cattle_id: cattleId,
      date,
      weight_kg: Number(weight),
    });

    setWeight("");
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this weight record?")) return;
    await api.delete(`/weights/${id}`);
    load();
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Heading size="sm">Weight History</Heading>

      <HStack spacing={3} flexWrap="wrap">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} w="160px" />
        <Input
          type="number"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          w="140px"
        />
        <Button colorScheme="brand" onClick={save}>
          Add
        </Button>
      </HStack>

      {records.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          No weight records yet.
        </Text>
      ) : (
        <>
          {records.length > 1 && (
            <Box h="180px">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={records}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} unit="kg" width={50} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight_kg" stroke="#3F7D57" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}

          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Weight (kg)</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {records.map((r) => (
                <Tr key={r.id}>
                  <Td>{r.date}</Td>
                  <Td>{r.weight_kg}</Td>
                  <Td>
                    <Button size="xs" colorScheme="red" variant="ghost" onClick={() => remove(r.id)}>
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </VStack>
  );
}
