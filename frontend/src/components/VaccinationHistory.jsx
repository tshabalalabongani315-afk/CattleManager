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
} from "@chakra-ui/react";
import { api } from "../api";

export default function VaccinationHistory({ cattleId }) {
  const [records, setRecords] = useState([]);
  const [vaccineName, setVaccineName] = useState("");
  const [dateGiven, setDateGiven] = useState(new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const load = () => {
    api
      .get("/vaccinations", { params: { cattle_id: cattleId } })
      .then((res) => setRecords(res.data));
  };

  useEffect(() => {
    load();
  }, [cattleId]);

  const save = async () => {
    if (!vaccineName || !dateGiven) return alert("Vaccine name and date given are required");

    await api.post("/vaccinations", {
      cattle_id: cattleId,
      vaccine_name: vaccineName,
      date_given: dateGiven,
      next_due_date: nextDueDate || null,
      notes,
    });

    setVaccineName("");
    setNextDueDate("");
    setNotes("");
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this vaccination record?")) return;
    await api.delete(`/vaccinations/${id}`);
    load();
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Heading size="sm">Vaccination History</Heading>

      <HStack spacing={3} flexWrap="wrap">
        <Input
          placeholder="Vaccine name"
          value={vaccineName}
          onChange={(e) => setVaccineName(e.target.value)}
          w="180px"
        />
        <Input
          type="date"
          value={dateGiven}
          onChange={(e) => setDateGiven(e.target.value)}
          w="160px"
        />
        <Input
          type="date"
          placeholder="Next due"
          value={nextDueDate}
          onChange={(e) => setNextDueDate(e.target.value)}
          w="160px"
        />
        <Input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button colorScheme="brand" onClick={save}>
          Add
        </Button>
      </HStack>

      {records.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          No vaccination records yet.
        </Text>
      ) : (
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Vaccine</Th>
              <Th>Date Given</Th>
              <Th>Next Due</Th>
              <Th>Notes</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {records.map((r) => (
              <Tr key={r.id}>
                <Td>{r.vaccine_name}</Td>
                <Td>{r.date_given}</Td>
                <Td>{r.next_due_date || "—"}</Td>
                <Td>{r.notes || "—"}</Td>
                <Td>
                  <Button size="xs" colorScheme="red" variant="ghost" onClick={() => remove(r.id)}>
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </VStack>
  );
}
