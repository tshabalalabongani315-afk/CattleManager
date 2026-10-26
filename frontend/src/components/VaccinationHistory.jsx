import { useState } from "react";
import {
  Badge,
  Button,
  IconButton,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { FiActivity, FiTrash2 } from "react-icons/fi";
import Field from "./ui/Field";
import EmptyState from "./ui/EmptyState";
import ErrorState from "./ui/ErrorState";
import { api } from "../api";
import { useFetch } from "../hooks/useFetch";
import { useConfirm } from "../hooks/confirmContext";
import { useNotify } from "../hooks/useNotify";
import { formatDate, todayISO } from "../utils/dates";
import { dueStatus } from "../utils/vaccinations";

export default function VaccinationHistory({ cattleId }) {
  const confirm = useConfirm();
  const notify = useNotify();
  const { data, loading, error, reload } = useFetch("/vaccinations", { cattle_id: cattleId });
  const records = data ?? [];

  const [vaccineName, setVaccineName] = useState("");
  const [dateGiven, setDateGiven] = useState(todayISO());
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const next = {};
    if (!vaccineName.trim()) next.vaccineName = "Enter the vaccine name";
    if (!dateGiven) next.dateGiven = "Choose the date given";
    if (nextDueDate && dateGiven && nextDueDate < dateGiven) next.nextDueDate = "Must be after the date given";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post("/vaccinations", {
        cattle_id: Number(cattleId),
        vaccine_name: vaccineName.trim(),
        date_given: dateGiven,
        next_due_date: nextDueDate || null,
        notes: notes.trim() || null,
      });
      notify.success("Vaccination recorded");
      setVaccineName("");
      setNextDueDate("");
      setNotes("");
      reload();
    } catch (err) {
      notify.error(err, "Couldn't save the vaccination");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record) => {
    const ok = await confirm({
      title: "Delete this vaccination record?",
      body: `${record.vaccine_name}, given ${formatDate(record.date_given)}.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/vaccinations/${record.id}`);
      notify.success("Record deleted");
      reload();
    } catch (err) {
      notify.error(err, "Couldn't delete the record");
    }
  };

  return (
    <Stack spacing={6}>
      <form onSubmit={save} noValidate>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={3} alignItems="start">
          <Field label="Vaccine" isRequired error={errors.vaccineName}>
            <Input value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} maxLength={100} placeholder="e.g. Anthrax" />
          </Field>
          <Field label="Date given" isRequired error={errors.dateGiven}>
            <Input type="date" value={dateGiven} max={todayISO()} onChange={(e) => setDateGiven(e.target.value)} />
          </Field>
          <Field label="Next due" error={errors.nextDueDate}>
            <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Optional" />
          </Field>
        </SimpleGrid>
        <Button type="submit" mt={4} isLoading={saving}>
          Record vaccination
        </Button>
      </form>

      {loading ? (
        <Skeleton h="120px" borderRadius="lg" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : records.length === 0 ? (
        <EmptyState icon={FiActivity} title="No vaccinations yet" description="Record the first one above to start the history." />
      ) : (
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Vaccine</Th>
                <Th>Given</Th>
                <Th>Next due</Th>
                <Th>Notes</Th>
                <Th w="1%">
                  <span style={{ position: "absolute", left: "-9999px" }}>Actions</span>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {records.map((r) => {
                const status = dueStatus(r.next_due_date);
                return (
                  <Tr key={r.id}>
                    <Td fontWeight="600">{r.vaccine_name}</Td>
                    <Td>{formatDate(r.date_given)}</Td>
                    <Td>
                      {formatDate(r.next_due_date)}{" "}
                      {status && (
                        <Badge ml={2} colorScheme={status.color}>
                          {status.label}
                        </Badge>
                      )}
                    </Td>
                    <Td color="fg.muted" whiteSpace="normal" maxW="260px">
                      {r.notes || "—"}
                    </Td>
                    <Td>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        aria-label={`Delete ${r.vaccine_name} record`}
                        icon={<FiTrash2 />}
                        onClick={() => remove(r)}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
