import { useMemo, useState } from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
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
import { FiTrash2, FiTrendingUp } from "react-icons/fi";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Field from "./ui/Field";
import EmptyState from "./ui/EmptyState";
import ErrorState from "./ui/ErrorState";
import { api } from "../api";
import { useFetch } from "../hooks/useFetch";
import { useConfirm } from "../hooks/confirmContext";
import { useNotify } from "../hooks/useNotify";
import { daysBetween, formatDate, todayISO } from "../utils/dates";

export default function WeightHistory({ cattleId }) {
  const confirm = useConfirm();
  const notify = useNotify();
  const { data, loading, error, reload } = useFetch("/weights", { cattle_id: cattleId });
  const records = useMemo(() => data ?? [], [data]);

  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Latest weight, total gain, and average daily gain between first and last weigh-in.
  const stats = useMemo(() => {
    if (records.length === 0) return null;
    const first = records[0];
    const last = records[records.length - 1];
    const days = daysBetween(first.date, last.date) || 0;
    const gain = last.weight_kg - first.weight_kg;
    return { latest: last.weight_kg, gain, adg: records.length > 1 && days > 0 ? gain / days : null };
  }, [records]);

  const save = async (e) => {
    e.preventDefault();
    const kg = Number(weight);
    const next = {};
    if (!weight || !Number.isFinite(kg) || kg <= 0) next.weight = "Enter a weight above 0";
    else if (kg > 3000) next.weight = "That looks too high";
    if (!date) next.date = "Choose a date";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post("/weights", { cattle_id: Number(cattleId), date, weight_kg: kg });
      notify.success("Weight recorded");
      setWeight("");
      reload();
    } catch (err) {
      notify.error(err, "Couldn't save the weight");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record) => {
    const ok = await confirm({
      title: "Delete this weigh-in?",
      body: `${record.weight_kg} kg on ${formatDate(record.date)}.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/weights/${record.id}`);
      notify.success("Weigh-in deleted");
      reload();
    } catch (err) {
      notify.error(err, "Couldn't delete the weigh-in");
    }
  };

  const fmt = (n, digits = 0) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: digits });

  return (
    <Stack spacing={6}>
      <form onSubmit={save} noValidate>
        <HStack spacing={3} align="flex-start" flexWrap="wrap">
          <Field label="Date" isRequired error={errors.date} w={{ base: "full", sm: "180px" }}>
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Weight (kg)" isRequired error={errors.weight} w={{ base: "full", sm: "180px" }}>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 312"
            />
          </Field>
          <Button type="submit" mt={{ base: 0, sm: "30px" }} isLoading={saving}>
            Record weight
          </Button>
        </HStack>
      </form>

      {loading ? (
        <Skeleton h="200px" borderRadius="lg" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : records.length === 0 ? (
        <EmptyState icon={FiTrendingUp} title="No weigh-ins yet" description="Record a weight to start tracking growth." />
      ) : (
        <>
          <SimpleGrid columns={3} spacing={3}>
            <Stat label="Latest" value={`${fmt(stats.latest, 1)} kg`} />
            <Stat label="Total gain" value={records.length > 1 ? `${stats.gain >= 0 ? "+" : ""}${fmt(stats.gain, 1)} kg` : "—"} />
            <Stat label="Avg daily gain" value={stats.adg != null ? `${fmt(stats.adg, 2)} kg/day` : "—"} />
          </SimpleGrid>

          {records.length > 1 && (
            <Box h="220px" role="img" aria-label="Weight over time chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={records} margin={{ left: 0, right: 12, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="date" fontSize={11} tickFormatter={(d) => formatDate(d).replace(/ \d{4}$/, "")} />
                  <YAxis fontSize={11} unit=" kg" width={64} domain={["dataMin - 10", "dataMax + 10"]} />
                  <Tooltip labelFormatter={formatDate} formatter={(v) => [`${v} kg`, "Weight"]} />
                  <Line type="monotone" dataKey="weight_kg" stroke="#3F7D57" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}

          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th isNumeric>Weight (kg)</Th>
                  <Th w="1%">
                    <span style={{ position: "absolute", left: "-9999px" }}>Actions</span>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {[...records].reverse().map((r) => (
                  <Tr key={r.id}>
                    <Td>{formatDate(r.date)}</Td>
                    <Td isNumeric fontWeight="600">
                      {fmt(r.weight_kg, 1)}
                    </Td>
                    <Td>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        aria-label={`Delete weigh-in from ${formatDate(r.date)}`}
                        icon={<FiTrash2 />}
                        onClick={() => remove(r)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </>
      )}
    </Stack>
  );
}

function Stat({ label, value }) {
  return (
    <Box bg="surface.muted" borderRadius="lg" p={3}>
      <Text fontSize="xs" color="fg.muted" fontWeight="600">
        {label}
      </Text>
      <Text fontSize={{ base: "md", sm: "xl" }} fontWeight="700" letterSpacing="-0.01em">
        {value}
      </Text>
    </Box>
  );
}
