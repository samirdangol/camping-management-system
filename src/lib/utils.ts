import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateRange(start: Date | string, end: Date | string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${format(startDate, "MMM d")} - ${format(endDate, "d, yyyy")}`;
  }
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
}

export function formatRelativeDate(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

/** Convert a blob URL to a proxied URL for private blob stores */
export function blobUrl(url: string): string {
  if (url.includes(".private.blob.vercel-storage.com")) {
    return `/api/blob?url=${encodeURIComponent(url)}`;
  }
  return url;
}
