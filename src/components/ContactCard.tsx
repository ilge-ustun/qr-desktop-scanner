import { useEffect, useId, useState } from "react";

import type { Contact } from "../lib/contact";
import { headlineSize } from "../lib/headline";
import { LABELS } from "../lib/payload";
import { DismissButton } from "./DismissButton";

type Props = {
  contact: Contact;
  onCopy: (text: string) => Promise<void>;
  onDismiss: () => void;
};

/** A contact: the name, then one row per value, each with its own Copy. It
 * calls, sends, opens and adds nothing; every value is shown as text. */
export function ContactCard({ contact, onCopy, onDismiss }: Props) {
  const id = useId();
  // A new object per copy, so a second copy restarts the timer.
  const [copied, setCopied] = useState<{ key: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = (key: string, value: string) => () => {
    setFailure(null);
    onCopy(value).then(
      () => setCopied({ key }),
      (e: unknown) => setFailure(String(e)),
    );
  };

  const fields = [
    ...contact.phones.map((value) => ({ label: "Phone", value })),
    ...contact.emails.map((value) => ({ label: "Email", value })),
    ...contact.organisations.map((value) => ({ label: "Organisation", value })),
    ...contact.websites.map((value) => ({ label: "Website", value })),
  ];

  return (
    <article className="card tone-ok">
      <header className="card-head">
        <div className="titles">
          <span className="meta">{LABELS.contact}</span>
          <span className={`headline size-${headlineSize(contact.name)}`}>{contact.name}</span>
        </div>
        <DismissButton onClick={onDismiss} />
      </header>
      {fields.length > 0 && (
        <ul className="fields">
          {fields.map(({ label, value }, i) => (
            <li key={i} className="field">
              <div className="field-text">
                <span className="field-name">{label}</span>
                <span className="mono" id={`${id}-${i}`}>
                  {value}
                </span>
              </div>
              <button
                type="button"
                className="ghost small"
                aria-describedby={`${id}-${i}`}
                onClick={copy(String(i), value)}
              >
                {copied?.key === String(i) ? "Copied" : "Copy"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {failure && <p className="failure">{failure}</p>}
      <div className="actions">
        <button type="button" className="ghost" onClick={copy("name", contact.name)}>
          {copied?.key === "name" ? "Copied" : "Copy name"}
        </button>
      </div>
    </article>
  );
}
