import { Link as RouterLink } from "react-router-dom";
import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, Button, Heading, HStack, SimpleGrid, Skeleton, Text } from "@chakra-ui/react";
import { FiBarChart2 } from "react-icons/fi";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { useFetch } from "../hooks/useFetch";
import { formatDate } from "../utils/dates";

export default function HerdStatus() {
  const { data, loading, error, reload } = useFetch("/dashboard");

  const counted = data?.latestCount?.count ?? null;
  const diff = counted != null ? data.active - counted : null;

  return (
    <PageTransition>
      <PageHeader
        title="Herd status"
        description="Your register compared with the most recent kraal count — a quick check that every animal is accounted for."
        actions={
          <Button as={RouterLink} to="/daily-counts" leftIcon={<FiBarChart2 />}>
            Log today&apos;s count
          </Button>
        }
      />

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      ) : loading ? (
        <Skeleton h="220px" borderRadius="xl" />
      ) : counted == null ? (
        <Card>
          <EmptyState
            icon={FiBarChart2}
            title="No count to compare yet"
            description="Log a daily count and it will be reconciled against your register here."
            action={
              <Button as={RouterLink} to="/daily-counts" size="sm">
                Log a count
              </Button>
            }
          />
        </Card>
      ) : (
        <Box maxW="720px">
          <Alert
            status={diff === 0 ? "success" : "warning"}
            variant="left-accent"
            borderRadius="xl"
            mb={4}
            alignItems="flex-start"
          >
            <AlertIcon mt={1} />
            <Box>
              <AlertTitle>{diff === 0 ? "Everything is accounted for" : diff > 0 ? `${diff} ${diff === 1 ? "animal" : "animals"} unaccounted for` : `${-diff} more counted than registered`}</AlertTitle>
              <AlertDescription fontSize="sm">
                {diff === 0
                  ? "The latest count matches your active register."
                  : diff > 0
                    ? "The register shows more active animals than were counted. Check movements, sales and deaths, or recount the kraal."
                    : "More animals were counted than are on the active register. Check for animals that haven't been registered yet."}
              </AlertDescription>
            </Box>
          </Alert>

          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
            <Figure label="Active on register" value={data.active} />
            <Figure label={`Counted ${formatDate(data.latestCount.date)}`} value={counted} />
            <Figure label="Difference" value={diff > 0 ? `+${diff}` : diff} emphasis={diff !== 0} />
          </SimpleGrid>

          <Text mt={4} fontSize="sm" color="fg.muted">
            Only animals with status <strong>Active</strong> count towards the register total.
          </Text>
        </Box>
      )}
    </PageTransition>
  );
}

function Figure({ label, value, emphasis }) {
  return (
    <Card p={5}>
      <Text fontSize="sm" color="fg.muted" fontWeight="600">
        {label}
      </Text>
      <HStack mt={2}>
        <Heading size="2xl" color={emphasis ? "orange.500" : undefined}>
          {value}
        </Heading>
      </HStack>
    </Card>
  );
}
