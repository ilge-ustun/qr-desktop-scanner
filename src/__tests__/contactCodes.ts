// The contact codes of story 001, exactly as the story writes them.

// Contacts
export const V1 =
  "BEGIN:VCARD\r\n" +
  "VERSION:3.0\r\n" +
  "N:Doe;Jane;;;\r\n" +
  "FN:Jane Doe\r\n" +
  "ORG:Smith\\, Jones\\; Partners\\\\Legal\r\n" +
  "TEL;TYPE=CELL:+31 6 1234 5678\r\n" +
  "TEL;TYPE=WORK,VOICE:+31 20 123 4567\r\n" +
  "EMAIL;TYPE=INTERNET:jane@example.com\r\n" +
  "EMAIL:j.doe@example.org\r\n" +
  "item1.URL;type=pref:https://example.com/\r\n" +
  " jane\r\n" + // folded: continues the URL line
  "END:VCARD";
export const V2 = "BEGIN:VCARD\nVERSION:4.0\nN:Doe;Jane;;;\nORG:Acme\\nLabs\nTEL:+31201234567\nEND:VCARD";
export const M1 =
  "MECARD:N:Doe,Jane;TEL:+31612345678;TEL:+31201234567;EMAIL:jane@example.com;" +
  "ORG:Smith\\, Jones\\; Partners\\\\Legal\\: NL;URL:https://example.com/jane;;";
// Contacts that do not parse
export const F1 = "BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nTEL:+31201234567"; // no END:VCARD
export const F2 = "BEGIN:VCARD\nVERSION:3.0\nTEL:+31201234567\nEND:VCARD"; // no FN, no N
export const F3 = "MECARD:TEL:+31201234567;EMAIL:jane@example.com;;"; // no N
// Markup
export const H1 = "BEGIN:VCARD\nFN:<img src=x onerror=alert(1)>\nTEL:<b>+31</b>\nEND:VCARD";

/** What AC1 says each contact holds. */
export const V1_CONTACT = {
  name: "Jane Doe",
  phones: ["+31 6 1234 5678", "+31 20 123 4567"],
  emails: ["jane@example.com", "j.doe@example.org"],
  organisations: ["Smith, Jones; Partners\\Legal"],
  websites: ["https://example.com/jane"],
};
export const V2_CONTACT = {
  name: "Jane Doe",
  phones: ["+31201234567"],
  emails: [],
  organisations: ["Acme\nLabs"],
  websites: [],
};
export const M1_CONTACT = {
  name: "Jane Doe",
  phones: ["+31612345678", "+31201234567"],
  emails: ["jane@example.com"],
  organisations: ["Smith, Jones; Partners\\Legal: NL"],
  websites: ["https://example.com/jane"],
};
