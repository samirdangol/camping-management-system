"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { signupFamily, signupExistingFamily } from "@/app/actions";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Calendar, Users, CheckCircle2, ShieldCheck } from "lucide-react";
import { formatDateRange } from "@/lib/utils";
import Link from "next/link";

type EventInfo = {
  id: number;
  title: string;
  location: string;
  locationUrl: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  organizerName: string;
  signupCount: number;
  status: string;
};

type FamilyPublic = {
  id: number;
  name: string;
  contactName: string;
  contactName2: string | null;
  phone: string | null;
  email: string | null;
  hasPin: boolean;
};

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { setCurrentFamily } = useCurrentFamily();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mode toggle
  const [mode, setMode] = useState<"new" | "existing">("new");

  // Existing family state
  const [families, setFamilies] = useState<FamilyPublic[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyPublic | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");

  // New family state
  const [familyName, setFamilyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactName2, setContactName2] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  // Headcount (shared)
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [elderly, setElderly] = useState(0);
  const [vegetarians, setVegetarians] = useState(0);
  const [notes, setNotes] = useState("");

  // Display name for success message
  const [signedUpName, setSignedUpName] = useState("");

  useEffect(() => {
    fetch(`/api/join/${inviteCode}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setEvent)
      .catch(() => setNotFound(true));
  }, [inviteCode]);

  // Fetch families when switching to existing mode
  useEffect(() => {
    if (mode === "existing" && families.length === 0) {
      fetch("/api/families")
        .then((r) => r.json())
        .then(setFamilies)
        .catch(() => {});
    }
  }, [mode, families.length]);

  function selectFamily(family: FamilyPublic) {
    setSelectedFamily(family);
    setPinInput("");
    setPinVerified(!family.hasPin);
    setPinError("");
  }

  async function verifyPin() {
    if (!selectedFamily) return;
    const res = await fetch("/api/families/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: selectedFamily.id, pin: pinInput }),
    });
    if (res.ok) {
      setPinVerified(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setLoading(true);

    try {
      const headcount = { adults, kids, elderly, vegetarians, notes: notes || undefined };

      if (mode === "existing" && selectedFamily && pinVerified) {
        const result = await signupExistingFamily(event.id, selectedFamily.id, headcount);
        setCurrentFamily(result.family.id, result.family.name);
        setSignedUpName(result.family.name);
      } else {
        if (!familyName.trim() || !contactName.trim()) return;
        const result = await signupFamily(
          event.id,
          { name: familyName.trim(), contactName: contactName.trim(), contactName2: contactName2.trim() || undefined, phone: phone || undefined, email: email || undefined, pin: pin || undefined },
          headcount
        );
        setCurrentFamily(result.family.id, result.family.name);
        setSignedUpName(result.family.name);
      }
      setSuccess(true);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  }

  if (notFound) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium">Invalid Invite Link</p>
          <p className="text-sm text-muted-foreground mt-1">This invite link is not valid or the event no longer exists.</p>
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <p className="text-lg font-medium">You&apos;re signed up!</p>
          <p className="text-sm text-muted-foreground">
            {signedUpName} has been signed up for {event.title}.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/login">Log in to manage the trip</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canSubmitExisting = mode === "existing" && selectedFamily && pinVerified;
  const canSubmitNew = mode === "new" && familyName.trim() && contactName.trim();

  return (
    <div className="space-y-4">
      {/* Event Info */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {event.location}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDateRange(new Date(event.startDate), new Date(event.endDate))}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {event.signupCount} {event.signupCount === 1 ? "family" : "families"} signed up
          </div>
          {event.description && <p className="pt-1">{event.description}</p>}
          <p className="text-xs">Organized by {event.organizerName}</p>
        </CardContent>
      </Card>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "new" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => { setMode("new"); setSelectedFamily(null); setPinVerified(false); }}
        >
          New Family
        </Button>
        <Button
          variant={mode === "existing" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => setMode("existing")}
        >
          Returning Family
        </Button>
      </div>

      {/* Signup Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {mode === "new" ? "Sign Up Your Family" : "Select Your Family"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "existing" ? (
              <>
                {/* Family Selection */}
                {!selectedFamily ? (
                  <div className="space-y-2">
                    <Label>Choose your family</Label>
                    {families.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No families found. Create a new one instead.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {families.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => selectFamily(f)}
                            className="w-full text-left px-3 py-2 rounded-md border hover:bg-accent transition-colors"
                          >
                            <div className="font-medium text-sm">{f.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {f.contactName}{f.contactName2 ? ` & ${f.contactName2}` : ""}
                              {f.hasPin && " · PIN protected"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : !pinVerified ? (
                  /* PIN Verification */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{selectedFamily.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedFamily.contactName}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedFamily(null); setPinVerified(false); }}>
                        Change
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Enter your family PIN</Label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        pattern="\d{4}"
                        maxLength={4}
                        placeholder="4-digit PIN"
                        value={pinInput}
                        onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
                        autoFocus
                      />
                      {pinError && <p className="text-xs text-red-600">{pinError}</p>}
                    </div>
                    <Button type="button" onClick={verifyPin} disabled={pinInput.length !== 4} className="w-full">
                      Verify PIN
                    </Button>
                  </div>
                ) : (
                  /* Verified - show summary */
                  <div className="rounded-md bg-green-50 border border-green-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{selectedFamily.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedFamily.contactName}{selectedFamily.contactName2 ? ` & ${selectedFamily.contactName2}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedFamily(null); setPinVerified(false); }}>
                        Change
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* New Family Fields */}
                <div className="space-y-2">
                  <Label>Family Name</Label>
                  <Input
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g. Dangol Family"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Suman Dangol"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Second Contact (optional)</Label>
                  <Input
                    value={contactName2}
                    onChange={(e) => setContactName2(e.target.value)}
                    placeholder="e.g. Sita Dangol"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (optional)</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Family PIN (optional)</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    placeholder="Set a 4-digit PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Protect your family identity with a 4-digit PIN
                  </p>
                </div>
              </>
            )}

            {/* Headcount - shown when ready to submit */}
            {(mode === "new" || (mode === "existing" && pinVerified)) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Adults</Label>
                    <Input type="number" min={0} value={adults} onChange={(e) => setAdults(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Kids</Label>
                    <Input type="number" min={0} value={kids} onChange={(e) => setKids(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Elderly</Label>
                    <Input type="number" min={0} value={elderly} onChange={(e) => setElderly(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vegetarians</Label>
                    <Input type="number" min={0} value={vegetarians} onChange={(e) => setVegetarians(parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dietary needs, allergies, etc." rows={2} />
                </div>

                <Button type="submit" className="w-full" disabled={loading || (!canSubmitExisting && !canSubmitNew)}>
                  {loading ? "Signing up..." : "Sign Up"}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
