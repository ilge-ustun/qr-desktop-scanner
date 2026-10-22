import { useId } from "react";

import type { FieldCardModel } from "../lib/cardModel";
import { Card } from "./Card";
import { KeyedButton } from "./Ink";
import { useCardKeys } from "./useCardKeys";
import { useCopyFeedback } from "./useCopyFeedback";

type Props = FieldCardModel & {
  onCopy: (text: string) => Promise<void>;
  /** Opens the model's `open` link, on a click or ⌘O. */
  onOpen: (url: string) => Promise<void>;
  onDismiss: () => void;
};

/** The card fieldCardModel describes: the headline, then one row per value,
 * each with its own Copy. Every value is shown as text, and each Copy names
 * the value it copies. */
export function FieldCard({ meta, headline, copyHeadline, fields, open, onCopy, onOpen, onDismiss }: Props) {
  const id = useId();
  const { copy, run, copied, failure } = useCopyFeedback(onCopy);
  const action = open && { label: open.label, run: run(() => onOpen(open.url)) };
  const keyed = useCardKeys({ copy: copy("headline", headline), open: action?.run });

  return (
    <Card tone="ok" meta={meta} headline={headline} headlineId={`${id}-headline`} keys={keyed} onDismiss={onDismiss}>
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
                {copied(String(i)) ? "Copied" : "Copy"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {failure && <p className="failure">{failure}</p>}
      <div className="actions">
        <KeyedButton shortcut="copy" describedBy={`${id}-headline`} onClick={copy("headline", headline)}>
          {copied("headline") ? "Copied" : copyHeadline}
        </KeyedButton>
        {action && (
          <KeyedButton shortcut="open" primary onClick={action.run}>
            {action.label}
          </KeyedButton>
        )}
      </div>
    </Card>
  );
}
