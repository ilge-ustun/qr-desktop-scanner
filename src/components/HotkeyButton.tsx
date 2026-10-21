import { useEffect, useState } from "react";

import { label, record } from "../lib/hotkey";

type Props = {
  /** The shortcut in force, as the crate writes it; null when none is set. */
  current: string | null;
  onRecordStart: () => void;
  onRecordCancel: () => void;
  /** Resolves to the shortcut now in force, or rejects with why not. */
  onPick: (accelerator: string) => Promise<string>;
};

type Mode = { name: "idle" } | { name: "recording" } | { name: "error"; message: string };

/** The shortcut chip: shows the keys, and records new ones when clicked. */
export function HotkeyButton({ current, onRecordStart, onRecordCancel, onPick }: Props) {
  const [mode, setMode] = useState<Mode>({ name: "idle" });
  const recording = mode.name === "recording";

  useEffect(() => {
    if (!recording) return;
    const cancel = () => {
      setMode({ name: "idle" });
      onRecordCancel();
    };
    // Capture phase on window: runs before the app's own Esc-to-close.
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape" && !e.metaKey && !e.ctrlKey && !e.altKey) return cancel();
      const result = record(e);
      if (result.kind === "incomplete") return;
      if (result.kind === "needsModifier") {
        setMode({ name: "error", message: "Use ⌘, ⌃ or ⌥ with a key." });
        onRecordCancel();
        return;
      }
      setMode({ name: "idle" });
      onPick(result.accelerator).catch((reason: unknown) => setMode({ name: "error", message: String(reason) }));
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", cancel);
    };
  }, [recording, onPick, onRecordCancel]);

  useEffect(() => {
    if (mode.name !== "error") return;
    const timer = setTimeout(() => setMode({ name: "idle" }), 3500);
    return () => clearTimeout(timer);
  }, [mode]);

  const start = () => {
    if (recording) return;
    setMode({ name: "recording" });
    onRecordStart();
  };

  return (
    <span className="hotkey-wrap">
      <button
        type="button"
        className={recording ? "hotkey recording" : "hotkey"}
        onClick={start}
        title="Click to change the shortcut"
        aria-label={recording ? "Press the new shortcut" : `Shortcut ${current ? label(current) : "not set"}, click to change`}
      >
        {recording ? "Press keys…" : current ? label(current) : "Set shortcut"}
      </button>
      {mode.name === "error" && (
        <span className="hotkey-error" role="alert">
          {mode.message}
        </span>
      )}
    </span>
  );
}
