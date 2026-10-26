import { useMemo } from "react";
import { useToast } from "@chakra-ui/react";
import { errorMessage } from "../api";

/** Consistent toasts: notify.success("Saved"), notify.error(err). */
export function useNotify() {
  const toast = useToast({ position: "bottom-right", duration: 4000, isClosable: true, variant: "subtle" });

  return useMemo(
    () => ({
      success: (title, description) => toast({ status: "success", title, description }),
      info: (title, description) => toast({ status: "info", title, description }),
      error: (errOrMessage, fallback) =>
        toast({
          status: "error",
          title: typeof errOrMessage === "string" ? errOrMessage : errorMessage(errOrMessage, fallback),
          duration: 6000,
        }),
    }),
    [toast]
  );
}
