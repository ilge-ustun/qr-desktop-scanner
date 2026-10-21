import { useEffect, useId, useState } from "react";

import { headlineSize } from "../lib/headline";
import { DismissButton } from "./DismissButton";
import { PrimaryButton } from "./Ink";

/** A value read from the code, under the app's name for it. */
export type Field = { label: string; value: string };

type Props = {
  /** The kind of code: the app's word, on the label. */
  meta: string;
  /** Read from the code: the name, number or place the card is about. */
  headline: string;
  /** The label of the button that copies the headline ("Copy name"). */
  copyHeadline: string;
  fields: Field[];
  /** The card's one other action (Open in Maps), when it has one. */
  action?: { label: string; run: () => Promise<void> };
  onCopy: (text: string) => Promise<void>;
  onDismiss: () => void;
};

/** The headline, then one row per value, each with its own Copy: every value
 * is shown as text, and each Copy names the value it copies. */
export function FieldCard({ meta, headline, copyHeadline, fields, action, onCopy, onDismiss }: Props) {
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
  const run = (task: () => Promise<void>) => () => {
    setFailure(null);
    task().catch((e: unknown) => setFailure(String(e)));
  };

  return (
    <article className="card tone-ok">
      <header className="card-head">
        <div className="titles">
          <span className="meta">{meta}</span>
          <span className={`headline size-${headlineSize(headline)}`} id={`${id}-headline`}>
            {headline}
          </span>
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
        <button
          type="button"
          className="ghost"
          aria-describedby={`${id}-headline`}
          onClick={copy("headline", headline)}
        >
          {copied?.key === "headline" ? "Copied" : copyHeadline}
        </button>
        {action && <PrimaryButton onClick={run(action.run)}>{action.label}</PrimaryButton>}
      </div>
    </article>
  );
}
