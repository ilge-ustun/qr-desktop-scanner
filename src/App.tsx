import { useEffect, useReducer, useRef } from "react";

import { Corners, PrimaryButton } from "./components/Neon";
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
  const ready = view.name === "idle" || view.name === "scanning";
  const afterScan = view.name === "found" || view.name === "notFound" || view.name === "error";

  return (
    <main className="popover" ref={popover}>
      <header className="top">
        <span className="brand">
          <span className="dot" aria-hidden="true" />
          QR Scanner
        </span>
        {afterScan ? (
          <button type="button" className="ghost small" onClick={scan}>
            Scan again
          </button>
        ) : (
          <button type="button" className="hotkey" onClick={scan} title="Scan — or press ⌘⇧2 in any app">
            ⌘⇧2
          </button>
        )}
      </header>

      <section className="body">
        {ready && (
          <>
            <div className="viewfinder tone-ok">
              <Corners />
              <span className="scanline" aria-hidden="true" />
              <span className="prompt">
                {view.name === "scanning" ? "Select the code…" : "Drag a box around\nany code on screen"}
              </span>
            </div>
            <PrimaryButton big onClick={scan} disabled={view.name === "scanning"}>
              Scan
            </PrimaryButton>
            <p className="hint">Photo, PDF, paused video, web page. Esc cancels.</p>
          </>
        )}
        {view.name === "notFound" && (
          <div className="card tone-warn">
            <Corners />
            <span className="meta">Nothing found</span>
            <p className="notice">No QR code in that area. Try a box around the whole code, including its white border.</p>
          </div>
        )}
        {view.name === "error" && (
          <div className="card tone-danger">
            <Corners />
            <span className="meta">Scan failed</span>
            <p className="failure">{view.message}</p>
          </div>
        )}
        {view.name === "permission" && (
          <PermissionGate onOpenSettings={() => void ipc.openScreenSettings()} onRetry={scan} />
        )}
        {view.name === "found" &&
          view.codes.map((code) => (
            <ResultCard
              key={code.text}
              code={code}
              onCopy={ipc.copyText}
              onOpen={ipc.openLink}
              onJoin={ipc.joinWifi}
              onDismiss={() => dispatch({ type: "dismiss", text: code.text })}
            />
          ))}
      </section>
    </main>
  );
}
