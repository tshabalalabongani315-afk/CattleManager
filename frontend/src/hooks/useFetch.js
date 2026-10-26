import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { api } from "../api";

/**
 * GET helper with loading / error / reload built in.
 *
 *   const { data, loading, error, reload } = useFetch("/cattle");
 *
 * `loading` is derived (a result is "current" only if it answers the latest
 * request key), so changing params shows a loading state with no extra state
 * writes, and stale responses from slow requests are ignored.
 */
export function useFetch(url, params, { enabled = true } = {}) {
  const paramsKey = JSON.stringify(params ?? {});
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  const requestKey = `${url}|${paramsKey}|${tick}`;

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();

    api
      .get(url, { params: JSON.parse(paramsKey), signal: controller.signal })
      .then((res) => setResult({ key: requestKey, data: res.data, error: null }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setResult((prev) => ({ key: requestKey, data: prev.data, error }));
      });

    return () => controller.abort();
  }, [url, paramsKey, requestKey, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return {
    data: result.data,
    error: result.key === requestKey ? result.error : null,
    loading: enabled && result.key !== requestKey,
    reload,
  };
}
