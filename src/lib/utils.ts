import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shift a date so date-fns format() (which uses local TZ) outputs the UTC calendar date */
function utcFormat(date: Date, pattern: string): string {
  const utc = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return format(utc, pattern);
}

export function formatDate(date: Date | string) {
  return utcFormat(new Date(date), "MMM d, yyyy");
}

export function formatDateRange(start: Date | string, end: Date | string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (startDate.getUTCMonth() === endDate.getUTCMonth()) {
    return `${utcFormat(startDate, "MMM d")} - ${utcFormat(endDate, "d, yyyy")}`;
  }
  return `${utcFormat(startDate, "MMM d")} - ${utcFormat(endDate, "MMM d, yyyy")}`;
}

export function formatRelativeDate(date: Date | string) {
  const utc = new Date(new Date(date).getTime() + new Date(date).getTimezoneOffset() * 60000);
  return formatDistanceToNow(utc, { addSuffix: true });
}

export function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

const FAMILY_EMOJIS = ["🐻", "🦌", "🦅", "🐿️", "🦋", "🐺", "🦉", "🐝", "🐟", "🦎", "🐢", "🦆"];

/** Deterministic animal emoji for a family based on its ID */
export function familyEmoji(familyId: number): string {
  return FAMILY_EMOJIS[familyId % FAMILY_EMOJIS.length];
}

/** Visual emoji representation of family members */
export function emojiMembers(adults: number, kids: number, elderly: number): string {
  const parts: string[] = [];
  if (adults > 0) parts.push(adults <= 4 ? "🧑‍🌾".repeat(adults) : `${adults}×🧑‍🌾`);
  if (kids > 0) parts.push(kids <= 4 ? "🧒".repeat(kids) : `${kids}×🧒`);
  if (elderly > 0) parts.push(elderly <= 4 ? "👴".repeat(elderly) : `${elderly}×👴`);
  return parts.join(" ");
}

/** Return a clickable URL for a location — uses custom URL if valid, otherwise Google Maps search */
export function locationLink(location: string, locationUrl?: string | null): string {
  if (locationUrl && (locationUrl.startsWith("http://") || locationUrl.startsWith("https://"))) {
    return locationUrl;
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
}

/** Convert a blob URL to a proxied URL for private blob stores */
export function blobUrl(url: string): string {
  if (url.includes(".private.blob.vercel-storage.com")) {
    return `/api/blob?url=${encodeURIComponent(url)}`;
  }
  return url;
}
