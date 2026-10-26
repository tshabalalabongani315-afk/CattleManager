import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Badge,
  Button,
  ButtonGroup,
  HStack,
  Link,
  Skeleton,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { FiActivity, FiDownload } from "react-icons/fi";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useFetch } from "../hooks/useFetch";
import { downloadCSV } from "../utils/csv";
import { formatDate } from "../utils/dates";
import { dueStatus } from "../utils/vaccinations";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "Overdue", label: "Overdue" },
  { key: "Due soon", label: "Due soon" },
];

export default function Vaccinations() {
  const { data, loading, error, reload } = useFetch("/vaccinations");
  const [filter, setFilter] = useState("all");

  const records = useMemo(
    () => (data ?? []).map((r) => ({ ...r, status: dueStatus(r.next_due_date) })),
    [data]
  );

  const counts = useMemo(
    () => ({
      all: records.length,
      Overdue: records.filter((r) => r.status?.label === "Overdue").length,
      "Due soon": records.filter((r) => r.status?.label === "Due soon").length,
    }),
    [records]
  );

  const shown = filter === "all" ? records : records.filter((r) => r.status?.label === filter);

  const exportCSV = () =>
    downloadCSV(
      "vaccinations.csv",
      [
        { key: "cattle_tag", label: "Tag" },
        { key: "vaccine_name", label: "Vaccine" },
        { key: "date_given", label: "Date Given" },
        { key: "next_due_date", label: "Next Due" },
        { key: "notes", label: "Notes" },
      ],
      shown
    );

  return (
    <PageTransition>
      <PageHeader
        title="Vaccinations"
        description="Every vaccination across the herd, soonest due first. Add records from an animal's profile."
        actions={
          <Button variant="subtle" leftIcon={<FiDownload />} onClick={exportCSV} isDisabled={shown.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Card p={0} overflow="hidden">
        {loading ? (
          <Stack p={5} spacing={3}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} h="44px" borderRadius="lg" />
            ))}
          </Stack>
        ) : error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={FiActivity}
            title="No vaccinations recorded"
            description="Open an animal from the register and add its first vaccination."
            action={
              <Button as={RouterLink} to="/register" size="sm">
                Go to the register
              </Button>
            }
          />
        ) : (
          <>
            <HStack p={4} borderBottom="1px solid" borderColor="line">
              <ButtonGroup size="sm" isAttached variant="subtle" role="group" aria-label="Filter by status">
                {FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    aria-pressed={filter === f.key}
                    bg={filter === f.key ? "brand.50" : undefined}
                    color={filter === f.key ? "brand.700" : undefined}
                    _dark={filter === f.key ? { bg: "whiteAlpha.200", color: "brand.200" } : undefined}
                  >
                    {f.label} ({counts[f.key]})
                  </Button>
                ))}
              </ButtonGroup>
            </HStack>

            {shown.length === 0 ? (
              <EmptyState icon={FiActivity} title="Nothing here" description="No records match this filter." />
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Tag</Th>
                      <Th>Vaccine</Th>
                      <Th>Given</Th>
                      <Th>Next due</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {shown.map((r) => (
                      <Tr key={r.id}>
                        <Td>
                          <Link as={RouterLink} to={`/cattle/${r.cattle_id}`} color="brand.fg" fontWeight="600">
                            {r.cattle_tag}
                          </Link>
                        </Td>
                        <Td>{r.vaccine_name}</Td>
                        <Td>{formatDate(r.date_given)}</Td>
                        <Td>{formatDate(r.next_due_date)}</Td>
                        <Td>
                          {r.status ? (
                            <Badge colorScheme={r.status.color}>{r.status.label}</Badge>
                          ) : (
                            <Text color="fg.muted">—</Text>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Card>
    </PageTransition>
  );
}
