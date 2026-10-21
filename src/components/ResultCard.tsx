import { useEffect, useState } from "react";

import type { DecodedCode } from "../lib/ipc";
import { classify, LABELS, type Payload } from "../lib/payload";
import { headlineSize } from "../lib/headline";
import { assess } from "../lib/urlSafety";
import { DismissButton } from "./DismissButton";
import { Corners, PrimaryButton, WarningIcon, type Tone } from "./Neon";
import { WifiCard } from "./WifiCard";

type Props = {
  code: DecodedCode;
  onCopy: (text: string) => Promise<void>;
  onOpen: (url: string) => Promise<void>;
  onJoin: (ssid: string, password: string) => Promise<void>;
  onDismiss: () => void;
};

export function ResultCard({ code, onCopy, onOpen, onJoin, onDismiss }: Props) {
  const payload = classify(code.text);
  if (payload.kind === "wifi" && payload.network) {
    return <WifiCard network={payload.network} onCopy={onCopy} onJoin={onJoin} onDismiss={onDismiss} />;
  }
  return <GenericCard payload={payload} onCopy={onCopy} onOpen={onOpen} onDismiss={onDismiss} />;
}

function GenericCard({ payload, onCopy, onOpen, onDismiss }: { payload: Payload } & Omit<Props, "code" | "onJoin">) {
  const linkish = payload.kind === "url" || payload.kind === "email";
  const safety = linkish ? assess(payload.text) : null;
  const warnings = safety?.warnings ?? [];
  const tone: Tone = warnings.some((w) => w.severity === "danger")
    ? "danger"
    : warnings.length
      ? "warn"
      : "ok";
  const headline =
    payload.kind === "email" ? payload.address : payload.kind === "phone" ? payload.number : safety?.domain;
  const meta = tone === "ok" ? LABELS[payload.kind] : `${LABELS[payload.kind]} · check before opening`;

  const [copied, setCopied] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const run = (action: () => Promise<void>, after?: () => void) => () => {
    setFailure(null);
    action().then(after, (e: unknown) => setFailure(String(e)));
  };
  const open = run(() => onOpen(payload.text));

  return (
    <article className={`card tone-${tone}`}>
      <Corners />
      <header className="card-head">
        <div className="titles">
          <span className="meta">{meta}</span>
          {headline && <span className={`headline size-${headlineSize(headline)}`}>{headline}</span>}
        </div>
        <DismissButton onClick={onDismiss} />
      </header>
      <p className="content">{payload.text}</p>
      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w.code} role="alert">
              <WarningIcon />
              {w.message}
            </li>
          ))}
        </ul>
      )}
      {failure && <p className="failure">{failure}</p>}
      <div className="actions">
        <button type="button" className="ghost" onClick={run(() => onCopy(payload.text), () => setCopied(true))}>
          {copied ? "Copied" : "Copy"}
        </button>
        {safety?.openable &&
          (tone === "ok" ? (
            <PrimaryButton onClick={open}>Open</PrimaryButton>
          ) : (
            <button type="button" className="risky" onClick={open}>
              Open anyway
            </button>
          ))}
      </div>
    </article>
  );
}
