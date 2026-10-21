// What the popover shows, driven by scan events from Rust.
import type { DecodedCode, ScanOutcome } from "./ipc";

export type View =
  | { name: "idle" }
  | { name: "scanning" }
  | { name: "found"; codes: DecodedCode[] }
  | { name: "notFound" }
  | { name: "permission" }
  | { name: "error"; message: string };

export type State = {
  view: View;
  /** What to go back to when a scan is cancelled with Esc. */
  beforeScan: View;
};

export type Action =
  | { type: "started" }
  | { type: "result"; outcome: ScanOutcome }
  | { type: "permissionMissing" }
  | { type: "dismiss"; text: string }
  | { type: "reset" };

export const initialState: State = { view: { name: "idle" }, beforeScan: { name: "idle" } };

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "started":
      return { view: { name: "scanning" }, beforeScan: state.view };
    case "permissionMissing":
      return { ...state, view: { name: "permission" } };
    case "result":
      return { ...state, view: viewFor(action.outcome, state.beforeScan) };
    case "reset":
      return initialState;
    case "dismiss": {
      if (state.view.name !== "found") return state;
      const codes = state.view.codes.filter((c) => c.text !== action.text);
      return { ...state, view: codes.length ? { name: "found", codes } : { name: "idle" } };
    }
  }
}

function viewFor(outcome: ScanOutcome, beforeScan: View): View {
  switch (outcome.kind) {
    case "found":
      return { name: "found", codes: outcome.codes };
    case "notFound":
      return { name: "notFound" };
    case "permissionDenied":
      return { name: "permission" };
    case "error":
      return { name: "error", message: outcome.message };
    case "cancelled":
      return beforeScan;
  }
}
