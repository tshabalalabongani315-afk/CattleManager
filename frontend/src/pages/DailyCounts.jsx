import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Grid,
  IconButton,
  Input,
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
import { FiBarChart2, FiTrash2 } from "react-icons/fi";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

export default function DailyCounts() {
  const confirm = useConfirm();
  const notify = useNotify();
  const { data, loading, error, reload } = useFetch("/daily-counts");
  const records = useMemo(() => data ?? [], [data]);

  const [count, setCount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [fieldError, setFieldError] = useState("");
  const [saving, setSaving] = useState(false);

  // Oldest -> newest for the chart; the table shows newest first with the change since the previous count.
  const chartData = useMemo(() => [...records].reverse().slice(-30), [records]);

  const save = async (e) => {
    e.preventDefault();
    const n = Number(count);
    if (count === "" || !Number.isInteger(n) || n < 0) {
      setFieldError("Enter a whole number, 0 or more");
      return;
    }
    setFieldError("");
    setSaving(true);
    try {
      await api.post("/daily-counts", { count: n, date });
      notify.success("Count saved");
      setCount("");
      reload();
    } catch (err) {
      notify.error(err, "Couldn't save the count");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record) => {
    const ok = await confirm({
      title: "Delete this count?",
      body: `${record.count} cattle on ${formatDate(record.date)}.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/daily-counts/${record.id}`);
      notify.success("Count deleted");
      reload();
    } catch (err) {
      notify.error(err, "Couldn't delete the count");
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Daily counts"
        description="Count the kraal each day. Herd status compares the latest count to your register."
      />

      <Grid templateColumns={{ base: "1fr", lg: "minmax(280px, 340px) 1fr" }} gap={4} alignItems="start">
        <Card as="form" onSubmit={save} noValidate>
          <Stack spacing={4}>
            <Field label="Cattle counted" isRequired error={fieldError}>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="e.g. 118"
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
            </Field>
            <Button type="submit" isLoading={saving}>
              Save count
            </Button>
          </Stack>
        </Card>

        <Stack spacing={4}>
          {chartData.length > 1 && (
            <Card>
              <Text fontWeight="650" mb={3}>
                Count over time
              </Text>
              <Box h="180px" role="img" aria-label="Daily count chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 8 }}>
                    <defs>
                      <linearGradient id="countFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3F7D57" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3F7D57" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="date" fontSize={11} tickFormatter={(d) => formatDate(d).replace(/ \d{4}$/, "")} />
                    <YAxis fontSize={11} width={40} allowDecimals={false} domain={["dataMin - 2", "dataMax + 2"]} />
                    <Tooltip labelFormatter={formatDate} formatter={(v) => [v, "Counted"]} />
                    <Area type="monotone" dataKey="count" stroke="#3F7D57" strokeWidth={2.5} fill="url(#countFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          )}

          <Card p={0} overflow="hidden">
            {loading ? (
              <Stack p={5} spacing={3}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} h="40px" borderRadius="lg" />
                ))}
              </Stack>
            ) : error && !data ? (
              <ErrorState error={error} onRetry={reload} />
            ) : records.length === 0 ? (
              <EmptyState icon={FiBarChart2} title="No counts yet" description="Save today's count to start the history." />
            ) : (
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th isNumeric>Counted</Th>
                      <Th>Change</Th>
                      <Th w="1%">
                        <span style={{ position: "absolute", left: "-9999px" }}>Actions</span>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {records.map((r, i) => {
                      const previous = records[i + 1];
                      const delta = previous ? r.count - previous.count : null;
                      return (
                        <Tr key={r.id}>
                          <Td>{formatDate(r.date)}</Td>
                          <Td isNumeric fontWeight="700">
                            {r.count}
                          </Td>
                          <Td>
                            {delta == null || delta === 0 ? (
                              <Text color="fg.muted">—</Text>
                            ) : (
                              <Badge colorScheme={delta > 0 ? "green" : "red"}>
                                {delta > 0 ? `+${delta}` : delta}
                              </Badge>
                            )}
                          </Td>
                          <Td>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              aria-label={`Delete count from ${formatDate(r.date)}`}
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
          </Card>
        </Stack>
      </Grid>
    </PageTransition>
  );
}
