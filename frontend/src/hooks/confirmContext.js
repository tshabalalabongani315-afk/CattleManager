import { createContext, useContext } from "react";

export const ConfirmContext = createContext(null);

/**
 * Promise-based replacement for window.confirm():
 *   if (!(await confirm({ title: "Delete animal?", danger: true }))) return;
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
