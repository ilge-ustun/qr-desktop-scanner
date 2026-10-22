import { useRef } from "react";

import type { DecodedCode } from "../lib/ipc";
import { classify, LABELS, type Payload } from "../lib/payload";
import { assess, linkMeta, toneOf } from "../lib/urlSafety";
import { Card } from "./Card";
import { ContactCard } from "./ContactCard";
import { GeoCard } from "./GeoCard";
import { KeyedButton, WarningIcon } from "./Ink";
import { PhoneCard } from "./PhoneCard";
import { SmsCard } from "./SmsCard";
import { useCardKeys } from "./useCardKeys";
import { useCopyFeedback } from "./useCopyFeedback";
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
  const tone = toneOf(warnings);
  // None when the code gives none: a text, a javascript: link, an empty mailto:.
  const headline =
    (payload.kind === "email" ? payload.address : payload.kind === "phone" ? payload.number : safety?.domain) ||
    undefined;
  const meta = linkMeta(LABELS[payload.kind], tone);

  const { copy, run, copied, failure } = useCopyFeedback(onCopy);
  const copyText = copy("text", payload.text);
  const open = run(() => onOpen(payload.text));
  // ⌘O opens only a link with no warnings. On a warned one it moves focus to
  // Open anyway, which then opens only when pressed itself.
  const openAnyway = useRef<HTMLButtonElement>(null);
  const keyed = useCardKeys({
    copy: copyText,
    open: safety?.openable ? (tone === "ok" ? open : () => openAnyway.current?.focus()) : undefined,
  });

  return (
    <Card tone={tone} meta={meta} headline={headline} keys={keyed} onDismiss={onDismiss}>
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
        <KeyedButton shortcut="copy" onClick={copyText}>
          {copied("text") ? "Copied" : "Copy"}
        </KeyedButton>
        {safety?.openable &&
          (tone === "ok" ? (
            <KeyedButton shortcut="open" primary onClick={open}>
              Open
            </KeyedButton>
          ) : (
            <button type="button" className="risky" onClick={open} ref={openAnyway}>
              Open anyway
            </button>
          ))}
      </div>
    </Card>
  );
}
