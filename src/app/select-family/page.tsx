"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentFamily } from "@/hooks/use-current-family";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tent, Plus, Users, Check, Lock } from "lucide-react";
import type { FamilyPublic } from "@/types";

function SelectFamilyContent() {
  const [families, setFamilies] = useState<FamilyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState("");
  const [contactNameInput, setContactNameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [creating, setCreating] = useState(false);

  // PIN verification state
  const [verifyingFamily, setVerifyingFamily] = useState<FamilyPublic | null>(
    null
  );
  const [verifyPin, setVerifyPin] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { familyId, setCurrentFamily, isLoaded } = useCurrentFamily();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSwitch = searchParams.get("switch") === "true";

  // Auto-redirect if family already selected (unless switching)
  useEffect(() => {
    if (isLoaded && familyId && !isSwitch) {
      router.replace("/events");
    }
  }, [isLoaded, familyId, isSwitch, router]);

  useEffect(() => {
    fetch("/api/families")
      .then((r) => r.json())
      .then(setFamilies)
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(family: FamilyPublic) {
    if (family.hasPin) {
      setVerifyingFamily(family);
      setVerifyPin("");
      setVerifyError("");
    } else {
      setCurrentFamily(family.id, family.name);
      router.push("/events");
    }
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyingFamily || verifyPin.length !== 4) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/families/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: verifyingFamily.id,
          pin: verifyPin,
        }),
      });
      if (res.ok) {
        setCurrentFamily(verifyingFamily.id, verifyingFamily.name);
        router.push("/events");
      } else {
        setVerifyError("Incorrect PIN. Please try again.");
        setVerifyPin("");
      }
    } catch {
      setVerifyError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!familyNameInput.trim() || !contactNameInput.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: familyNameInput.trim(),
          contactName: contactNameInput.trim(),
          pin: pinInput || null,
        }),
      });
      const newFamily = await res.json();
      setCurrentFamily(newFamily.id, newFamily.name);
      router.push("/events");
    } catch {
      setCreating(false);
    }
  }

  // Don't show anything while checking if we should auto-redirect
  if (!isLoaded || (familyId && !isSwitch)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Tent className="h-6 w-6 text-green-700" />
          </div>
          <h1 className="text-2xl font-bold">Camp Planner</h1>
          <p className="text-sm text-muted-foreground">
            {isSwitch
              ? "Switch to a different family"
              : "Select your family to get started"}
          </p>
        </div>

        {/* PIN Verification View */}
        {verifyingFamily ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Enter PIN for {verifyingFamily.name}
              </CardTitle>
              <CardDescription>
                This family is protected with a PIN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyPin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="verifyPin">4-Digit PIN</Label>
                  <Input
                    id="verifyPin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    placeholder="Enter 4-digit PIN"
                    value={verifyPin}
                    onChange={(e) =>
                      setVerifyPin(
                        e.target.value.replace(/\D/g, "").slice(0, 4)
                      )
                    }
                    autoFocus
                    required
                  />
                </div>
                {verifyError && (
                  <p className="text-sm text-red-600">{verifyError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setVerifyingFamily(null)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={verifying || verifyPin.length !== 4}
                  >
                    {verifying ? "Verifying..." : "Continue"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Existing Families */}
            {loading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading families...
                </CardContent>
              </Card>
            ) : families.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Select Your Family
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {families.map((family) => (
                    <button
                      key={family.id}
                      onClick={() => handleSelect(family)}
                      className="w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-green-50 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <Users className="h-4 w-4 text-green-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {family.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {family.contactName}
                        </p>
                      </div>
                      {family.hasPin && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      {familyId === family.id && (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {/* Create New Family */}
            <Card>
              {!showCreate ? (
                <CardContent className="py-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {families.length > 0 ? "New Family" : "Create Your Family"}
                  </Button>
                </CardContent>
              ) : (
                <>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Create New Family
                    </CardTitle>
                    <CardDescription>
                      Enter your family name and primary contact
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreate} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="familyName">Family Name</Label>
                        <Input
                          id="familyName"
                          placeholder="e.g. Dangol Family"
                          value={familyNameInput}
                          onChange={(e) => setFamilyNameInput(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Contact Person</Label>
                        <Input
                          id="contactName"
                          placeholder="e.g. Suman Dangol"
                          value={contactNameInput}
                          onChange={(e) => setContactNameInput(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pin">Family PIN (optional)</Label>
                        <Input
                          id="pin"
                          type="password"
                          inputMode="numeric"
                          pattern="\d{4}"
                          maxLength={4}
                          placeholder="4-digit PIN"
                          value={pinInput}
                          onChange={(e) =>
                            setPinInput(
                              e.target.value.replace(/\D/g, "").slice(0, 4)
                            )
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Set a 4-digit PIN to prevent others from selecting
                          your family
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowCreate(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={
                            creating ||
                            !familyNameInput.trim() ||
                            !contactNameInput.trim()
                          }
                        >
                          {creating ? "Creating..." : "Create & Continue"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function SelectFamilyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SelectFamilyContent />
    </Suspense>
  );
}
