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

function dayKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function getEventPhase(input: PhaseInput): Phase {
  if (input.status === "cancelled") return "cancelled";

  const today = dayKey(new Date());
  const start = dayKey(input.startDate);
  const end = dayKey(input.endDate);
  // If no explicit deadline, signup closes when the trip starts
  const signupEnd = input.signupDeadline ? dayKey(input.signupDeadline) : start;

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
