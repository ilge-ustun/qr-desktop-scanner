import { useEffect, useState } from "react";

import type { DecodedCode } from "../lib/ipc";
import { classify, LABELS, type Payload } from "../lib/payload";
import { assess } from "../lib/urlSafety";
import { WifiCard } from "./WifiCard";

type Props = {
  code: DecodedCode;
  onCopy: (text: string) => Promise<void>;
  onOpen: (url: string) => Promise<void>;
  onJoin: (ssid: string, password: string) => Promise<void>;
};

export function ResultCard({ code, onCopy, onOpen, onJoin }: Props) {
  const payload = classify(code.text);
  if (payload.kind === "wifi" && payload.network) {
    return <WifiCard network={payload.network} onCopy={onCopy} onJoin={onJoin} />;
  }
  return <GenericCard payload={payload} onCopy={onCopy} onOpen={onOpen} />;
}

function GenericCard({ payload, onCopy, onOpen }: { payload: Payload } & Omit<Props, "code" | "onJoin">) {
  const linkish = payload.kind === "url" || payload.kind === "email";
  const safety = linkish ? assess(payload.text) : null;
  const headline = payload.kind === "email" ? payload.address : safety?.domain;

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

  return (
    <article className="card">
      <header>
        <span className={`badge badge-${payload.kind}`}>{LABELS[payload.kind]}</span>
        {headline && <span className="headline">{headline}</span>}
      </header>
      <p className="content">{payload.text}</p>
      {safety?.warnings.map((w) => (
        <p key={w.code} className={`warning ${w.severity}`} role="alert">
          {w.message}
        </p>
      ))}
      {failure && <p className="warning danger">{failure}</p>}
      <div className="actions">
        <button type="button" onClick={run(() => onCopy(payload.text), () => setCopied(true))}>
          {copied ? "Copied" : "Copy"}
        </button>
        {safety?.openable && (
          <button type="button" className="primary" onClick={run(() => onOpen(payload.text))}>
            Open
          </button>
        )}
      </div>
    </article>
  );
}
