import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "./useNotify";

/** One-click sandbox: creates a throwaway account pre-filled with sample data. */
export function useDemo() {
  const { startDemo } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      await startDemo();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      notify.error(err, "Couldn't start the demo. Please try again.");
      setLoading(false);
    }
  };

  return { startDemo: start, loading };
}
