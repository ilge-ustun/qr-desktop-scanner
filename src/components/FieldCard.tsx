import { useId } from "react";

import { Card } from "./Card";
import { KeyedButton } from "./Ink";
import { useCardKeys } from "./useCardKeys";
import { useCopyFeedback } from "./useCopyFeedback";

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
  /** The card's one other action, an Open (Open in Maps), when it has one: ⌘O
   * runs it. */
  action?: { label: string; run: () => Promise<void> };
  onCopy: (text: string) => Promise<void>;
  onDismiss: () => void;
};

/** The headline, then one row per value, each with its own Copy: every value
 * is shown as text, and each Copy names the value it copies. */
export function FieldCard({ meta, headline, copyHeadline, fields, action, onCopy, onDismiss }: Props) {
  const id = useId();
  const { copy, run, copied, failure } = useCopyFeedback(onCopy);
  const keyed = useCardKeys({ copy: copy("headline", headline), open: action && run(action.run) });

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
          <KeyedButton shortcut="open" primary onClick={run(action.run)}>
            {action.label}
          </KeyedButton>
        )}
      </div>
    </Card>
  );
}
