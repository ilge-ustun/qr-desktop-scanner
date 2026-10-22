import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { Card } from "./components/Card";
import { HotkeyButton } from "./components/HotkeyButton";
import { Corners, PrimaryButton } from "./components/Ink";
import { PermissionGate } from "./components/PermissionGate";
import { ResultCard } from "./components/ResultCard";
import * as ipc from "./lib/ipc";
import { initialState, reduce } from "./lib/scanState";

export function App() {
  const [state, dispatch] = useReducer(reduce, initialState);
  const { view } = state;
  const popover = useRef<HTMLElement>(null);
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

  // The window is as tall as what it shows: Rust resizes it whenever the
  // content's height changes (bounded there, with the rest scrolling here).
  useEffect(() => {
    const element = popover.current;
    if (!element) return;
    // + the offset shadow printed below and right of the popover (styles.css).
    const observer = new ResizeObserver(() => void ipc.fitPopover(Math.ceil(element.offsetHeight) + 6));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let gone = false;
    ipc
      .onScan({
        started: (scope) => dispatch({ type: "started", scope }),
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
  const findAll = () => void ipc.findAllOnScreen();
  const reset = () => dispatch({ type: "reset" });
  const ready = view.name === "idle" || view.name === "scanning";
  const afterScan = view.name === "found" || view.name === "notFound" || view.name === "error";

  return (
    <main className="popover" ref={popover}>
      <header className="top">
        <span className="brand">
          QR Scanner
        </span>
        {afterScan ? (
          <button type="button" className="ghost small" onClick={scan}>
            Scan again
          </button>
        ) : (
          <HotkeyButton
            current={hotkey}
            onRecordStart={suspendHotkey}
            onRecordCancel={resumeHotkey}
            onPick={pickHotkey}
          />
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
            <button type="button" className="ghost" onClick={findAll} disabled={view.name === "scanning"}>
              Find all on screen
            </button>
            <p className="hint">Photo, PDF, paused video, web page. Esc cancels.</p>
          </>
        )}
        {view.name === "notFound" && (
          <Card tone="warn" meta="Nothing found" onDismiss={reset}>
            <p className="notice">
              {view.scope === "screen"
                ? "Searched the whole screen and found no QR code. If one is small, Scan again and drag around just that code."
                : "No QR code in that area. Try a box around the whole code, including its white border."}
            </p>
          </Card>
        )}
        {view.name === "error" && (
          <Card tone="danger" meta="Scan failed" onDismiss={reset}>
            <p className="failure">{view.message}</p>
          </Card>
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
