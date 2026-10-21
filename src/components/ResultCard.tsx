import { useEffect, useRef, useState } from "react";

import { SHORTCUTS } from "../lib/cardKeys";
import type { DecodedCode } from "../lib/ipc";
import { classify, LABELS, type Payload } from "../lib/payload";
import { headlineSize } from "../lib/headline";
import { assess } from "../lib/urlSafety";
import { ContactCard } from "./ContactCard";
import { DismissButton } from "./DismissButton";
import { GeoCard } from "./GeoCard";
import { Keyed, PrimaryButton, WarningIcon, type Tone } from "./Ink";
import { PhoneCard } from "./PhoneCard";
import { SmsCard } from "./SmsCard";
import { useCardKeys } from "./useCardKeys";
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
  if (payload.kind === "contact") {
    return <ContactCard contact={payload.contact} onCopy={onCopy} onDismiss={onDismiss} />;
  }
  if (payload.kind === "phone" && payload.number.trim()) {
    return <PhoneCard number={payload.number} onCopy={onCopy} onDismiss={onDismiss} />;
  }
  if (payload.kind === "sms") {
    return <SmsCard sms={payload.sms} onCopy={onCopy} onDismiss={onDismiss} />;
  }
  if (payload.kind === "geo") {
    return <GeoCard geo={payload.geo} onCopy={onCopy} onOpen={onOpen} onDismiss={onDismiss} />;
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
  const copy = run(() => onCopy(payload.text), () => setCopied(true));
  const open = run(() => onOpen(payload.text));
  // ⌘O opens only a link with no warnings. On a warned one it moves focus to
  // Open anyway, which then opens only when pressed itself.
  const openAnyway = useRef<HTMLButtonElement>(null);
  const keyed = useCardKeys({
    copy,
    open: safety?.openable ? (tone === "ok" ? open : () => openAnyway.current?.focus()) : undefined,
  });

  return (
    <article className={`card tone-${tone}`} {...keyed}>
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
              {/* Wrapped so the mark stays inline and strikes every line. */}
              <span>
                <span className="mark">{w.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {failure && <p className="failure">{failure}</p>}
      <div className="actions">
        <Keyed shortcut="copy">
          <button type="button" className="ghost" onClick={copy} aria-keyshortcuts={SHORTCUTS.copy.aria}>
            {copied ? "Copied" : "Copy"}
          </button>
        </Keyed>
        {safety?.openable &&
          (tone === "ok" ? (
            <Keyed shortcut="open">
              <PrimaryButton onClick={open} keyshortcuts={SHORTCUTS.open.aria}>
                Open
              </PrimaryButton>
            </Keyed>
          ) : (
            <button type="button" className="risky" onClick={open} ref={openAnyway}>
              Open anyway
            </button>
          ))}
      </div>
    </article>
  );
}
