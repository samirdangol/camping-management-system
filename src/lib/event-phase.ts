export const PHASES = ["signup", "planning", "live", "settlement", "done", "cancelled"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABELS: Record<Phase, string> = {
  signup: "Signup",
  planning: "Planning",
  live: "Live",
  settlement: "Settlement",
  done: "Done",
  cancelled: "Cancelled",
};

export const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  signup: "Families RSVPing",
  planning: "Meals & supplies",
  live: "On the trip",
  settlement: "Wrap-up & expenses",
  done: "Fully settled",
  cancelled: "Trip cancelled",
};

export const PHASE_BADGE_CLASSES: Record<Phase, string> = {
  signup: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  planning: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  live: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  settlement: "bg-purple-900/40 text-purple-300 border-purple-700/50",
  done: "bg-muted text-muted-foreground",
  cancelled: "bg-red-900/40 text-red-300 border-red-700/50",
};

// Lower comes first when listing active trips
export const PHASE_LIST_ORDER: Record<Phase, number> = {
  signup: 0,
  planning: 1,
  live: 2,
  settlement: 3,
  done: 4,
  cancelled: 5,
};

export type PhaseInput = {
  startDate: Date | string;
  endDate: Date | string;
  signupDeadline: Date | string | null | undefined;
  status?: string | null;
  allSettled?: boolean;
};

// Event date fields are stored as UTC midnight of the wall-clock date the user typed,
// so read them back via getUTC*. "Today" needs the viewer's local calendar date so the
// phase reflects what the user perceives — using toISOString() flips the day after
// ~5pm Pacific.
function utcDayKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getEventPhase(input: PhaseInput): Phase {
  if (input.status === "cancelled") return "cancelled";

  const today = localTodayKey();
  const start = utcDayKey(input.startDate);
  const end = utcDayKey(input.endDate);
  // If no explicit deadline, signup closes when the trip starts
  const signupEnd = input.signupDeadline ? utcDayKey(input.signupDeadline) : start;

  if (today < signupEnd) return "signup";
  if (today < start) return "planning";
  if (today <= end) return "live";
  return input.allSettled ? "done" : "settlement";
}

export function isPastPhase(phase: Phase): boolean {
  return phase === "done" || phase === "cancelled";
}

export function isOpenForSignup(phase: Phase): boolean {
  return phase === "signup" || phase === "planning";
}
