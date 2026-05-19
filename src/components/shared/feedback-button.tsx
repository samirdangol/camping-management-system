"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentFamily } from "@/hooks/use-current-family";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const pathname = usePathname();
  const { familyId, familyName } = useCurrentFamily();

  // Don't show on login or join pages
  if (pathname === "/login" || pathname.startsWith("/join/")) return null;

  async function handleSubmit() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          page: pathname,
          familyId: familyId || null,
          familyName: familyName || null,
        }),
      });
      if (res.ok) {
        setSent(true);
        setMessage("");
        setTimeout(() => {
          setSent(false);
          setOpen(false);
        }, 2000);
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-md hover:bg-primary transition-colors"
          title="Send feedback"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Feedback panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Suggestion / Feedback</span>
            <button
              onClick={() => { setOpen(false); setSent(false); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3 space-y-3">
            {sent ? (
              <div className="text-center py-4">
                <p className="text-sm text-emerald-400 font-medium">Thank you for your feedback!</p>
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What can we improve? Any suggestions or issues..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={4}
                  autoFocus
                />
                {familyName && (
                  <p className="text-[10px] text-muted-foreground">
                    Submitting as {familyName}
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  disabled={sending || !message.trim()}
                  onClick={handleSubmit}
                >
                  {sending ? "Sending..." : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
