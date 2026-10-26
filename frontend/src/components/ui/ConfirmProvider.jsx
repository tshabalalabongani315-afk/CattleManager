import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from "@chakra-ui/react";
import { ConfirmContext } from "../../hooks/confirmContext";

export default function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const cancelRef = useRef(null);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    []
  );

  const settle = (answer) => {
    request?.resolve(answer);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        isOpen={Boolean(request)}
        leastDestructiveRef={cancelRef}
        onClose={() => settle(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4} borderRadius="2xl" bg="surface">
            <AlertDialogHeader fontSize="lg">{request?.title ?? "Are you sure?"}</AlertDialogHeader>
            {request?.body && <AlertDialogBody color="fg.muted">{request.body}</AlertDialogBody>}
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} variant="subtle" onClick={() => settle(false)}>
                Cancel
              </Button>
              <Button
                colorScheme={request?.danger ? "red" : "brand"}
                onClick={() => settle(true)}
              >
                {request?.confirmLabel ?? "Confirm"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
