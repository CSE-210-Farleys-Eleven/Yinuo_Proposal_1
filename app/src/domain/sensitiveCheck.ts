// Warns before publishing text that looks like personal data or secrets.
// Deterministic patterns, run in the browser: nothing is sent anywhere to be checked.
// Known gap: physical addresses are not detected (too fuzzy for patterns).

export type SensitiveKind = "email" | "phone" | "studentId" | "apiKey" | "meetingLink";
export interface Finding {
  kind: SensitiveKind;
  match: string;
}

const PATTERNS: [SensitiveKind, RegExp][] = [
  ["meetingLink", /https?:\/\/\S*(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com)\S*/gi],
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["apiKey", /\b(?:sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[abprs]-[A-Za-z0-9-]{10,})/g],
  ["phone", /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/g],
  ["studentId", /\b[A-Z]\d{8}\b/g],
];

export const SENSITIVE_LABELS: Record<SensitiveKind, string> = {
  email: "an email address",
  phone: "a phone number",
  studentId: "a student ID",
  apiKey: "an API key or token",
  meetingLink: "a meeting link (anyone could join)",
};

/** All findings, in the order they appear in the text. Overlapping matches are reported once. */
export function checkSensitive(text: string): Finding[] {
  const found: { kind: SensitiveKind; match: string; start: number; end: number }[] = [];
  for (const [kind, pattern] of PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      const overlaps = found.some((f) => start < f.end && end > f.start);
      if (!overlaps) found.push({ kind, match: m[0], start, end });
    }
  }
  return found.sort((a, b) => a.start - b.start).map(({ kind, match }) => ({ kind, match }));
}
