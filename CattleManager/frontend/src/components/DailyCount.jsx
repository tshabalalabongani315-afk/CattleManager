import { useEffect, useState } from "react";
import {
  Box,
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

export default function DailyCounts() {
  const [movements, setMovements] = useState([]);
  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const load = async () => {
    const res = await axios.get("http://localhost:4000/movements");
    setMovements(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!quantity) return alert("Enter quantity");

    await axios.post("http://localhost:4000/movements", {
      type,
      quantity,
      note,
      date,
    });

    setQuantity("");
    setNote("");
    load();
  };

  const remove = async id => {
    if (!confirm("Delete record?")) return;
    await axios.delete(`http://localhost:4000/movements/${id}`);
    load();
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box bg="white" p={6} rounded="lg" shadow="md">
        <Heading size="md" mb={4}>
          Daily Cattle Movements
        </Heading>

        <HStack spacing={3}>
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="SOLD">SOLD</option>
            <option value="DIED">DIED</option>
          </Select>

          <Input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />

          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />

          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />

          <Button colorScheme="green" onClick={save}>
            Add
          </Button>
        </HStack>
      </Box>

      <Box bg="white" p={6} rounded="lg" shadow="md">
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
            {movements.map(m => (
              <Tr key={m.id}>
                <Td>{m.date}</Td>
                <Td>{m.type}</Td>
                <Td>{m.quantity}</Td>
                <Td>{m.note}</Td>
                <Td>
                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() => remove(m.id)}
                  >
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </VStack>
  );
}
