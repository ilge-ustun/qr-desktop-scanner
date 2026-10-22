import { useReducer, useRef } from "react";

import { Card } from "./components/Card";
import { HotkeyButton } from "./components/HotkeyButton";
import { Corners, PrimaryButton } from "./components/Ink";
import { PermissionGate } from "./components/PermissionGate";
import { ResultCard } from "./components/ResultCard";
import { useEscapeHides } from "./hooks/useEscapeHides";
import { useFitPopover } from "./hooks/useFitPopover";
import { useHotkey } from "./hooks/useHotkey";
import { usePermissionCheck } from "./hooks/usePermissionCheck";
import { useScanEvents } from "./hooks/useScanEvents";
import * as ipc from "./lib/ipc";
import { initialState, reduce } from "./lib/scanState";

export function App() {
  const [state, dispatch] = useReducer(reduce, initialState);
  const { view } = state;
  const popover = useRef<HTMLElement>(null);
  const { hotkey, pickHotkey, suspendHotkey, resumeHotkey } = useHotkey();
  useFitPopover(popover);
  useScanEvents(dispatch);
  usePermissionCheck(dispatch);
  useEscapeHides();

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
            <div className="viewfinder">
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
