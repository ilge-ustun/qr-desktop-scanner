import { useEffect, type Dispatch } from "react";

import * as ipc from "../lib/ipc";
import type { reduce } from "../lib/scanState";

type Action = Parameters<typeof reduce>[1];

/** Feeds the scan events into the reducer while the component is mounted. */
export function useScanEvents(dispatch: Dispatch<Action>) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let gone = false;
    ipc
      .onScan({
        started: (scope) => dispatch({ type: "started", scope }),
        result: (outcome) => dispatch({ type: "result", outcome }),
      })
      .then((u) => (gone ? u() : (unlisten = u)));
    return () => {
      gone = true;
      unlisten?.();
    };
  }, [dispatch]);
}
