import { useRef } from "react";

import { fieldCardModel } from "../lib/cardModel";
import type { DecodedCode } from "../lib/ipc";
import { classify, LABELS, type Payload } from "../lib/payload";
import { assess, linkMeta, toneOf } from "../lib/urlSafety";
import { Card } from "./Card";
import { FieldCard } from "./FieldCard";
import { KeyedButton, WarningIcon } from "./Ink";
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
  // The card of the code's text, for a link, an email, a text, and the codes
  // below that have nothing else to show.
  const generic = <GenericCard payload={payload} onCopy={onCopy} onOpen={onOpen} onDismiss={onDismiss} />;
  switch (payload.kind) {
    case "wifi":
      // Without a network name there is nothing to join.
      return payload.network ? (
        <WifiCard network={payload.network} onCopy={onCopy} onJoin={onJoin} onDismiss={onDismiss} />
      ) : (
        generic
      );
    case "phone":
      // tel: without a number has nothing to copy but the code.
      return payload.number ? (
        <FieldCard {...fieldCardModel(payload)} onCopy={onCopy} onOpen={onOpen} onDismiss={onDismiss} />
      ) : (
        generic
      );
    case "contact":
    case "sms":
    case "geo":
      return <FieldCard {...fieldCardModel(payload)} onCopy={onCopy} onOpen={onOpen} onDismiss={onDismiss} />;
    case "url":
    case "email":
    case "text":
      return generic;
    default: {
      // Each kind has its case above: a new kind of Payload fails tsc here.
      const unhandled: never = payload;
      return unhandled;
    }
  }
}

function GenericCard({ payload, onCopy, onOpen, onDismiss }: { payload: Payload } & Omit<Props, "code" | "onJoin">) {
  const linkish = payload.kind === "url" || payload.kind === "email";
  const safety = linkish ? assess(payload.text) : null;
  const warnings = safety?.warnings ?? [];
  const tone = toneOf(warnings);
  // None when the code gives none: a text, a javascript: link, an empty mailto:.
  const headline = (payload.kind === "email" ? payload.address : safety?.domain) || undefined;
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
