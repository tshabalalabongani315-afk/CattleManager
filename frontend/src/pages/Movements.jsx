import { useState } from "react";
import {
  Badge,
  Button,
  Grid,
  IconButton,
  Input,
  Select,
  SimpleGrid,
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
import { FiRepeat, FiTrash2 } from "react-icons/fi";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/ui/PageHeader";
import Field from "../components/ui/Field";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { api } from "../api";
import { useFetch } from "../hooks/useFetch";
import { useConfirm } from "../hooks/confirmContext";
import { useNotify } from "../hooks/useNotify";
import { formatDate, todayISO } from "../utils/dates";

const TYPES = [
  { value: "IN", label: "In — animals arriving", color: "green" },
  { value: "OUT", label: "Out — moved elsewhere", color: "orange" },
  { value: "SOLD", label: "Sold", color: "blue" },
  { value: "DIED", label: "Died", color: "red" },
];
const COLOR = Object.fromEntries(TYPES.map((t) => [t.value, t.color]));

export default function Movements() {
  const confirm = useConfirm();
  const notify = useNotify();
  const { data, loading, error, reload } = useFetch("/movements");
  const records = data ?? [];

  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const q = Number(quantity);
    const next = {};
    if (!quantity || !Number.isInteger(q) || q < 1) next.quantity = "Enter a whole number, 1 or more";
    if (!date) next.date = "Choose a date";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post("/movements", { type, quantity: q, note: note.trim() || null, date });
      notify.success("Movement logged");
      setQuantity("");
      setNote("");
      reload();
    } catch (err) {
      notify.error(err, "Couldn't log the movement");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record) => {
    const ok = await confirm({
      title: "Delete this movement?",
      body: `${record.type}: ${record.quantity} on ${formatDate(record.date)}.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/movements/${record.id}`);
      notify.success("Movement deleted");
      reload();
    } catch (err) {
      notify.error(err, "Couldn't delete the movement");
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Movements"
        description="Log animals arriving, leaving, sold or lost, with a note for your records."
      />

      <Grid templateColumns={{ base: "1fr", lg: "minmax(280px, 340px) 1fr" }} gap={4} alignItems="start">
        <Card as="form" onSubmit={save} noValidate>
          <Stack spacing={4}>
            <Field label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <SimpleGrid columns={2} spacing={3}>
              <Field label="How many" isRequired error={errors.quantity}>
                <Input type="number" inputMode="numeric" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
              <Field label="Date" isRequired error={errors.date}>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </SimpleGrid>
            <Field label="Note">
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Optional" />
            </Field>
            <Button type="submit" isLoading={saving}>
              Log movement
            </Button>
          </Stack>
        </Card>

        <Card p={0} overflow="hidden">
          {loading ? (
            <Stack p={5} spacing={3}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} h="40px" borderRadius="lg" />
              ))}
            </Stack>
          ) : error && !data ? (
            <ErrorState error={error} onRetry={reload} />
          ) : records.length === 0 ? (
            <EmptyState icon={FiRepeat} title="No movements yet" description="Log the first one using the form." />
          ) : (
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Type</Th>
                    <Th isNumeric>Animals</Th>
                    <Th>Note</Th>
                    <Th w="1%">
                      <span style={{ position: "absolute", left: "-9999px" }}>Actions</span>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {records.map((r) => (
                    <Tr key={r.id}>
                      <Td>{formatDate(r.date)}</Td>
                      <Td>
                        <Badge colorScheme={COLOR[r.type] ?? "gray"}>{r.type}</Badge>
                      </Td>
                      <Td isNumeric fontWeight="700">
                        {r.quantity}
                      </Td>
                      <Td whiteSpace="normal" maxW="280px">
                        <Text color={r.note ? "fg" : "fg.muted"}>{r.note || "—"}</Text>
                      </Td>
                      <Td>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          aria-label={`Delete ${r.type} movement from ${formatDate(r.date)}`}
                          icon={<FiTrash2 />}
                          onClick={() => remove(r)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </PageTransition>
  );
}
