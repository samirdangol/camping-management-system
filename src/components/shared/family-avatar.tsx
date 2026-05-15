import { cn, familyEmoji } from "@/lib/utils";

type Props = {
  familyId?: number | null;
  fallbackEmoji?: string;
  className?: string;
};

export function FamilyAvatar({ familyId, fallbackEmoji = "👤", className }: Props) {
  const emoji = familyId != null ? familyEmoji(familyId) : fallbackEmoji;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full border border-border bg-card text-xs align-middle leading-none mr-1.5",
        className
      )}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
