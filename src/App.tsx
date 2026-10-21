import { useEffect, useReducer, useRef } from "react";

import { PermissionGate } from "./components/PermissionGate";
import { ResultCard } from "./components/ResultCard";
import * as ipc from "./lib/ipc";
import { initialState, reduce } from "./lib/scanState";

export function App() {
  const [state, dispatch] = useReducer(reduce, initialState);
  const { view } = state;
  const popover = useRef<HTMLElement>(null);

  // The window is as tall as what it shows: Rust resizes it whenever the
  // content's height changes (bounded there, with the rest scrolling here).
  useEffect(() => {
    const element = popover.current;
    if (!element) return;
    const observer = new ResizeObserver(() => void ipc.fitPopover(Math.ceil(element.offsetHeight)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let gone = false;
    ipc
      .onScan({
        started: () => dispatch({ type: "started" }),
        result: (outcome) => dispatch({ type: "result", outcome }),
      })
      .then((u) => (gone ? u() : (unlisten = u)));
    ipc.screenPermission().then((granted) => {
      if (!granted) dispatch({ type: "permissionMissing" });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ipc.hidePopover();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      gone = true;
      unlisten?.();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const scan = () => void ipc.startScan();

  return (
    <main className="popover" ref={popover}>
      <header className="top">
        <h1>QR Scanner</h1>
        <kbd title="Scan from anywhere">⌥⇧Q</kbd>
      </header>

      {view.name !== "permission" && (
        <button type="button" className="scan" onClick={scan} disabled={view.name === "scanning"}>
          {view.name === "scanning" ? "Select the code…" : "Scan QR code on screen"}
        </button>
      )}

      <section className="body">
        {view.name === "idle" && (
          <p className="hint">
            Drag a box around a QR code anywhere on your screen — a photo, a PDF, a paused video or a web page.
            Press Esc to cancel.
          </p>
        )}
        {view.name === "scanning" && <p className="hint">Drag a box around the QR code. Esc cancels.</p>}
        {view.name === "notFound" && (
          <p className="notice">No QR code found there. Try a box around the whole code, including its white border.</p>
        )}
        {view.name === "error" && <p className="warning danger">Scan failed: {view.message}</p>}
        {view.name === "permission" && (
          <PermissionGate onOpenSettings={() => void ipc.openScreenSettings()} onRetry={scan} />
        )}
        {view.name === "found" && (
          <>
            {view.codes.length > 1 && <p className="hint">{view.codes.length} codes found</p>}
            {view.codes.map((code) => (
              <ResultCard
                key={code.text}
                code={code}
                onCopy={ipc.copyText}
                onOpen={ipc.openLink}
                onJoin={ipc.joinWifi}
                onDismiss={() => dispatch({ type: "dismiss", text: code.text })}
              />
            ))}
          </>
        )}
      </section>
    </main>
  );
}
