import { LABELS } from "../lib/payload";
import type { Sms } from "../lib/sms";
import { FieldCard } from "./FieldCard";

type Props = {
  sms: Sms;
  onCopy: (text: string) => Promise<void>;
  onDismiss: () => void;
};

/** An SMS: the number, then the message when there is one, each with its own
 * Copy. No Send. */
export function SmsCard({ sms, onCopy, onDismiss }: Props) {
  return (
    <FieldCard
      meta={LABELS.sms}
      headline={sms.number}
      copyHeadline="Copy number"
      fields={sms.message ? [{ label: "Message", value: sms.message }] : []}
      onCopy={onCopy}
      onDismiss={onDismiss}
    />
  );
}
