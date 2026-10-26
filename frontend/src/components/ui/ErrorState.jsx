import { Button, Text, VStack } from "@chakra-ui/react";
import { FiAlertTriangle } from "react-icons/fi";
import { errorMessage } from "../../api";
import EmptyState from "./EmptyState";

/** Shown when a page's data fails to load, with a retry. */
export default function ErrorState({ error, onRetry, title = "Couldn't load this" }) {
  return (
    <EmptyState
      icon={FiAlertTriangle}
      title={title}
      description={errorMessage(error)}
      action={
        onRetry && (
          <VStack>
            <Button size="sm" variant="subtle" onClick={onRetry}>
              Try again
            </Button>
            <Text fontSize="xs" color="fg.muted">
              If it keeps happening, sign out and back in.
            </Text>
          </VStack>
        )
      }
    />
  );
}
