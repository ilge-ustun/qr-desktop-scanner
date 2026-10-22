import type { ReactNode } from "react";

import { headlineSize } from "../lib/headline";
import { DismissButton } from "./DismissButton";
import type { Tone } from "./Ink";
import type { useCardKeys } from "./useCardKeys";

type Props = {
  tone: Tone;
  /** The app's word for what the card shows, on the label. */
  meta: string;
  /** Read from the code: what the card is about, in large type. A card whose
   * code gives none has no headline. */
  headline?: string;
  /** The headline's id, for a button that names it (aria-describedby). */
  headlineId?: string;
  /** What useCardKeys returns. A result card answers keys; App's notices
   * (Nothing found, Scan failed) do not. */
  keys?: ReturnType<typeof useCardKeys>;
  onDismiss: () => void;
  children: ReactNode;
};

/** The frame of every card: its label and headline, the × that dismisses it,
 * then what the card holds. A result card is an article with its label and
 * headline under .titles; a notice is a div with the label alone. */
export function Card({ tone, meta, headline, headlineId, keys, onDismiss, children }: Props) {
  const className = `card tone-${tone}`;
  const label = <span className="meta">{meta}</span>;
  const head = (
    <header className="card-head">
      {keys ? (
        <div className="titles">
          {label}
          {headline !== undefined && (
            <span className={`headline size-${headlineSize(headline)}`} id={headlineId}>
              {headline}
            </span>
          )}
        </div>
      ) : (
        label
      )}
      <DismissButton onClick={onDismiss} />
    </header>
  );
  return keys ? (
    <article className={className} {...keys}>
      {head}
      {children}
    </article>
  ) : (
    <div className={className}>
      {head}
      {children}
    </div>
  );
}
