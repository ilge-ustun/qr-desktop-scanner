// The big name on a card (domain, network, address) must stay readable in one
// piece: long ones get a smaller size instead of breaking mid-word.
type HeadlineSize = "l" | "m" | "s";

export function headlineSize(text: string): HeadlineSize {
  if (text.length <= 14) return "l";
  if (text.length <= 20) return "m";
  return "s";
}
