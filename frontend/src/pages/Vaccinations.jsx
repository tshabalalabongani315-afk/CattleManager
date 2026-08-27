import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Link,
} from "@chakra-ui/react";
import axios from "axios";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../api";
import { downloadCSV } from "../utils/csv";

function dueStatus(nextDueDate) {
  if (!nextDueDate) return null;
  const due = new Date(nextDueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return { label: "Overdue", color: "red" };
  if (diffDays <= 14) return { label: "Due soon", color: "orange" };
  return null;
}

export default function Vaccinations() {
  const [records, setRecords] = useState([]);

  const load = () => {
    axios.get(`${API_BASE}/vaccinations`).then((res) => setRecords(res.data));
  };

  useEffect(() => {
    load();
  }, []);

  const exportCSV = () => {
    downloadCSV(
      "vaccinations.csv",
      [
        { key: "cattle_tag", label: "Tag" },
        { key: "vaccine_name", label: "Vaccine" },
        { key: "date_given", label: "Date Given" },
        { key: "next_due_date", label: "Next Due" },
        { key: "notes", label: "Notes" },
      ],
      records
    );
  };

  return (
    <PageTransition>
      <Card>
        <Heading size="md" mb={1}>
          Vaccination Records
        </Heading>
        <Text color="gray.500" fontSize="sm" mb={4}>
          All vaccinations across the herd, sorted by next due date.
        </Text>

        <Button size="sm" mb={4} onClick={exportCSV} isDisabled={records.length === 0}>
          Export CSV
        </Button>

        {records.length === 0 ? (
          <Text color="gray.500">
            No vaccination records yet — add one from an animal's profile page.
          </Text>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Tag</Th>
                <Th>Vaccine</Th>
                <Th>Date Given</Th>
                <Th>Next Due</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {records.map((r) => {
                const status = dueStatus(r.next_due_date);
                return (
                  <Tr key={r.id}>
                    <Td>
                      <Link as={RouterLink} to={`/cattle/${r.cattle_id}`} color="brand.500">
                        {r.cattle_tag}
                      </Link>
                    </Td>
                    <Td>{r.vaccine_name}</Td>
                    <Td>{r.date_given}</Td>
                    <Td>{r.next_due_date || "—"}</Td>
                    <Td>
                      {status && <Badge colorScheme={status.color}>{status.label}</Badge>}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>
    </PageTransition>
  );
}
