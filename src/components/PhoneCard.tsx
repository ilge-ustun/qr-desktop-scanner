import { LABELS } from "../lib/payload";
import { FieldCard } from "./FieldCard";

type Props = {
  number: string;
  onCopy: (text: string) => Promise<void>;
  onDismiss: () => void;
};

/** A phone number (`tel:`): the number and its Copy. No Call. */
export function PhoneCard({ number, onCopy, onDismiss }: Props) {
  return (
    <FieldCard
      meta={LABELS.phone}
      headline={number}
      copyHeadline="Copy number"
      fields={[]}
      onCopy={onCopy}
      onDismiss={onDismiss}
    />
  );
}
