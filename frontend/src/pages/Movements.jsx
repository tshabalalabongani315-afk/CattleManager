import { useEffect, useState } from "react";
import {
  Heading,
  VStack,
  HStack,
  Select,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import axios from "axios";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../api";

export default function Movements() {
  const [movements, setMovements] = useState([]);
  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    const res = await axios.get(`${API_BASE}/movements`);
    setMovements(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!quantity) return alert("Enter quantity");

    await axios.post(`${API_BASE}/movements`, { type, quantity, note, date });

    setQuantity("");
    setNote("");
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete record?")) return;
    await axios.delete(`${API_BASE}/movements/${id}`);
    load();
  };

  return (
    <PageTransition>
      <VStack spacing={6} align="stretch">
        <Card>
          <Heading size="md" mb={4}>
            Log a Movement
          </Heading>

          <HStack spacing={3} flexWrap="wrap">
            <Select value={type} onChange={(e) => setType(e.target.value)} w="auto">
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="SOLD">SOLD</option>
              <option value="DIED">DIED</option>
            </Select>

            <Input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              w="140px"
            />

            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              w="160px"
            />

            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <Button colorScheme="brand" onClick={save}>
              Add
            </Button>
          </HStack>
        </Card>

        <Card>
          <Heading size="md" mb={4}>
            Records
          </Heading>

          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Qty</Th>
                <Th>Note</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {movements.map((m) => (
                <Tr key={m.id}>
                  <Td>{m.date}</Td>
                  <Td>{m.type}</Td>
                  <Td>{m.quantity}</Td>
                  <Td>{m.note}</Td>
                  <Td>
                    <Button size="sm" colorScheme="red" onClick={() => remove(m.id)}>
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </VStack>
    </PageTransition>
  );
}
