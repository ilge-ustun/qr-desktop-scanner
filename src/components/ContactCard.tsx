import type { Contact } from "../lib/contact";
import { LABELS } from "../lib/payload";
import { FieldCard } from "./FieldCard";

type Props = {
  contact: Contact;
  onCopy: (text: string) => Promise<void>;
  onDismiss: () => void;
};

/** A contact: the name, then one row per value, each with its own Copy. It
 * calls, sends, opens and adds nothing; every value is shown as text. */
export function ContactCard({ contact, onCopy, onDismiss }: Props) {
  const fields = [
    ...contact.phones.map((value) => ({ label: "Phone", value })),
    ...contact.emails.map((value) => ({ label: "Email", value })),
    ...contact.organisations.map((value) => ({ label: "Organisation", value })),
    ...contact.websites.map((value) => ({ label: "Website", value })),
  ];
  return (
    <FieldCard
      meta={LABELS.contact}
      headline={contact.name}
      copyHeadline="Copy name"
      fields={fields}
      onCopy={onCopy}
      onDismiss={onDismiss}
    />
  );
}
