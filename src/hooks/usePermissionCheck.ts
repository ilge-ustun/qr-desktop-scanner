import { useEffect, type Dispatch } from "react";

import * as ipc from "../lib/ipc";
import type { reduce } from "../lib/scanState";

type Action = Parameters<typeof reduce>[1];

/** Asks once whether screen access is granted. A rejection is dropped: the
 * first scan shows the permission screen if access is really missing. */
export function usePermissionCheck(dispatch: Dispatch<Action>) {
  useEffect(() => {
    ipc.screenPermission().then(
      (granted) => {
        if (!granted) dispatch({ type: "permissionMissing" });
      },
      () => undefined,
    );
  }, [dispatch]);
}
