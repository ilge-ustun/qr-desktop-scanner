import type { Geo } from "../lib/geo";
import { LABELS } from "../lib/payload";
import { FieldCard } from "./FieldCard";

type Props = {
  geo: Geo;
  onCopy: (text: string) => Promise<void>;
  onOpen: (url: string) => Promise<void>;
  onDismiss: () => void;
};

/** A place: its name when the code has one, else the coordinates as written,
 * each with its own Copy. Open in Maps only for valid coordinates, with the
 * link the parser built from the two numbers. */
export function GeoCard({ geo, onCopy, onOpen, onDismiss }: Props) {
  const { coordinates, place, search, mapsLink } = geo;
  // In the search form (geo:0,0?q=…) 0,0 is no place: the search stands alone.
  const fields = place && !search ? [{ label: "Coordinates", value: coordinates }] : [];
  return (
    <FieldCard
      meta={LABELS.geo}
      headline={place || coordinates}
      copyHeadline={place ? "Copy place" : "Copy coordinates"}
      fields={fields}
      action={mapsLink ? { label: "Open in Maps", run: () => onOpen(mapsLink) } : undefined}
      onCopy={onCopy}
      onDismiss={onDismiss}
    />
  );
}
