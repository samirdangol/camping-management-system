"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Check, Copy } from "lucide-react";

export function InviteLinkCard({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/join/${inviteCode}` : `/join/${inviteCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Invite Families
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">
          Share this link so families can sign up — no login needed.
        </p>
        <div className="flex gap-2">
          <Input value={url} readOnly className="text-xs bg-white" />
          <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
