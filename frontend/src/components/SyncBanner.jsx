import { Alert, AlertDescription, AlertIcon, Box, Button, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { offline } from "../api";
import { useAppUpdate } from "../hooks/useAppUpdate";
import { useSyncStatus } from "../hooks/useSyncStatus";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Tells the user what the app is doing with their data: working offline,
 * uploading, couldn't save something, or a new version is waiting. Renders
 * nothing when everything is normal.
 */
export default function SyncBanner() {
  const { online, pending, failed, syncing } = useSyncStatus();
  const update = useAppUpdate();

  if (online && !pending && failed.length === 0 && !update.ready) return null;

  return (
    <Stack spacing={2} px={{ base: 4, md: 8 }} pt={3} role="region" aria-label="Connection and sync status">
      {!online && (
        <Banner status="warning">
          {pending > 0
            ? `You're offline. ${plural(pending, "change")} saved on this device — they'll upload when you're back online.`
            : "You're offline. You can keep working: changes are saved on this device and uploaded when you're back online."}
        </Banner>
      )}

      {online && pending > 0 && (
        <Banner
          status="info"
          action={
            !syncing && (
              <Button size="xs" onClick={() => offline.sync()}>
                Upload now
              </Button>
            )
          }
        >
          <HStack spacing={2}>
            {syncing && <Spinner size="xs" />}
            <Text>{syncing ? `Uploading ${plural(pending, "change")}…` : `${plural(pending, "change")} waiting to upload.`}</Text>
          </HStack>
        </Banner>
      )}

      {failed.length > 0 && (
        <Alert status="error" borderRadius="lg" alignItems="flex-start" role="status">
          <AlertIcon mt={1} />
          <Box flex="1" minW={0}>
            <AlertDescription fontSize="sm" fontWeight="600">
              {plural(failed.length, "change")} couldn't be saved on the server:
            </AlertDescription>
            <Stack as="ul" spacing={1} mt={1} listStyleType="none">
              {failed.map((f) => (
                <HStack as="li" key={f.id} justify="space-between" spacing={3} fontSize="sm">
                  <Text noOfLines={2}>
                    {f.label} — {f.error}
                  </Text>
                  <Button size="xs" variant="outline" flexShrink={0} onClick={() => offline.dismissFailed(f.id)}>
                    Dismiss
                  </Button>
                </HStack>
              ))}
            </Stack>
          </Box>
        </Alert>
      )}

      {update.ready && (
        <Banner
          status="info"
          action={
            <Button size="xs" onClick={() => update.apply()}>
              Update now
            </Button>
          }
        >
          A new version of Cattle Manager is ready.
        </Banner>
      )}
    </Stack>
  );
}

function Banner({ status, action, children }) {
  return (
    <Alert status={status} borderRadius="lg" py={2} role="status">
      <AlertIcon />
      <AlertDescription flex="1" fontSize="sm">
        {children}
      </AlertDescription>
      {action}
    </Alert>
  );
}
