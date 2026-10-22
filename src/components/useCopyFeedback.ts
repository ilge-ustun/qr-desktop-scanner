import { useEffect, useState } from "react";

/**
 * What a result card says after its actions: Copied on the button that
 * copied, for 1.5 s from the last copy, and why the last action failed.
 * `copy(key, value)` makes the handler of the button `key`; `run(task)` makes
 * the handler of another action, an Open, whose failure shows in the same
 * place. Each action clears the failure when it starts.
 */
export function useCopyFeedback(onCopy: (text: string) => Promise<void>) {
  // A new object per copy, so a second copy restarts the timer.
  const [copied, setCopied] = useState<{ key: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const run = (task: () => Promise<void>, after?: () => void) => () => {
    setFailure(null);
    task().then(after, (e: unknown) => setFailure(String(e)));
  };
  const copy = (key: string, value: string) => run(() => onCopy(value), () => setCopied({ key }));
  return { copy, run, copied: (key: string) => copied?.key === key, failure };
}
