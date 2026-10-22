import { useCallback, useEffect, useState } from "react";

import * as ipc from "../lib/ipc";

/** The global shortcut, and what HotkeyButton needs to pick, suspend and resume it. */
export function useHotkey() {
  const [hotkey, setHotkey] = useState<string | null>(null);

  useEffect(() => {
    ipc.getHotkey().then(setHotkey, () => undefined);
  }, []);

  const pickHotkey = useCallback(async (accelerator: string) => {
    const now = await ipc.setHotkey(accelerator);
    setHotkey(now);
    return now;
  }, []);
  const suspendHotkey = useCallback(() => void ipc.suspendHotkey(), []);
  const resumeHotkey = useCallback(() => void ipc.resumeHotkey(), []);

  return { hotkey, pickHotkey, suspendHotkey, resumeHotkey };
}
