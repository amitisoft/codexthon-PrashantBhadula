import { useEffect, useState } from "react";

export function useTimedMessage(timeoutMs = 5000) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setMessage(null), timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [message, timeoutMs]);

  return [message, setMessage] as const;
}
