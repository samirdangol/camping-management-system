"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { signupFamily, removeSignup } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Trash2, Pencil, Plus } from "lucide-react";
import { useIsOrganizer } from "@/hooks/use-is-organizer";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { emojiMembers } from "@/lib/utils";
import { FamilyAvatar } from "@/components/shared/family-avatar";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import type { Family, SignupWithFamily, HeadcountSummary } from "@/types";

export default function SignupPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const isOrganizer = useIsOrganizer(eventId);
  const { familyId: currentFamilyId } = useCurrentFamily();
  const [signups, setSignups] = useState<SignupWithFamily[]>([]);
  const [familyName, setFamilyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactName2, setContactName2] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paypalMe, setPaypalMe] = useState("");
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [elderly, setElderly] = useState(0);
  const [vegetarians, setVegetarians] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Family[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchSignups = useCallback(async () => {
    const sigs = await fetch(`/api/events/${eventId}/signups`).then((r) => r.json());
    setSignups(sigs);
  }, [eventId]);

  useEffect(() => {
    fetchSignups();
  }, [fetchSignups]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleFamilyNameChange(value: string) {
    setFamilyName(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        const res = await fetch(`/api/families/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function selectSuggestion(family: Family) {
    setFamilyName(family.name);
    setContactName(family.contactName);
    setContactName2(family.contactName2 || "");
    setPhone(family.phone || "");
    setEmail(family.email || "");
    setPaypalMe(family.paypalMe || "");
    setShowSuggestions(false);

    // If already signed up for this event, load their headcount; always set editing ID
    const existing = signups.find((s) => s.familyId === family.id);
    if (existing) {
      setAdults(existing.adults);
      setKids(existing.kids);
      setElderly(existing.elderly);
      setVegetarians(existing.vegetarians);
      setNotes(existing.notes || "");
    }
    setEditingFamilyId(family.id);
  }

  function handleEdit(signup: SignupWithFamily) {
    setFamilyName(signup.family.name);
    setContactName(signup.family.contactName);
    setContactName2(signup.family.contactName2 || "");
    setPhone(signup.family.phone || "");
    setEmail(signup.family.email || "");
    setPaypalMe(signup.family.paypalMe || "");
    setAdults(signup.adults);
    setKids(signup.kids);
    setElderly(signup.elderly);
    setVegetarians(signup.vegetarians);
    setNotes(signup.notes || "");
    setEditingFamilyId(signup.familyId);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 0);
  }

  function resetForm() {
    setFamilyName("");
    setContactName("");
    setContactName2("");
    setPhone("");
    setEmail("");
    setPaypalMe("");
    setAdults(1);
    setKids(0);
    setElderly(0);
    setVegetarians(0);
    setNotes("");
    setEditingFamilyId(null);
    setShowForm(false);
  }

  const isEditing = editingFamilyId !== null || signups.some((s) => s.family.name === familyName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim() || !contactName.trim()) return;
    setLoading(true);
    await signupFamily(
      parseInt(eventId, 10),
      { name: familyName.trim(), contactName: contactName.trim(), contactName2: contactName2.trim() || undefined, phone: phone || undefined, email: email || undefined, paypalMe: paypalMe.trim() || undefined, familyId: editingFamilyId ?? undefined },
      { adults, kids, elderly, vegetarians, notes: notes || undefined }
    );
    await fetchSignups();
    resetForm();
    setLoading(false);
  }

  function handleRemove(familyId: number) {
    setPendingDeleteId(familyId);
  }

  async function confirmRemove() {
    if (pendingDeleteId === null) return;
    const idToDelete = pendingDeleteId;
    setPendingDeleteId(null);
    await removeSignup(parseInt(eventId, 10), idToDelete);
    await fetchSignups();
    if (editingFamilyId === idToDelete) resetForm();
  }

  const summary: HeadcountSummary = {
    totalFamilies: signups.length,
    totalAdults: signups.reduce((s, x) => s + x.adults, 0),
    totalKids: signups.reduce((s, x) => s + x.kids, 0),
    totalElderly: signups.reduce((s, x) => s + x.elderly, 0),
    totalVegetarians: signups.reduce((s, x) => s + x.vegetarians, 0),
    grandTotal: signups.reduce((s, x) => s + x.adults + x.kids + x.elderly, 0),
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-emerald-950/30 border-emerald-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Headcount Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{summary.totalFamilies}</div>
              <div className="text-xs text-muted-foreground">Families</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.grandTotal}</div>
              <div className="text-xs text-muted-foreground">People</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.totalVegetarians}</div>
              <div className="text-xs text-muted-foreground">Vegetarian</div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-3 text-sm text-muted-foreground">
            <span>{summary.totalAdults} adults</span>
            <span>{summary.totalKids} kids</span>
            <span>{summary.totalElderly} elderly</span>
          </div>
        </CardContent>
      </Card>

      {/* Signup List — mobile-friendly cards */}
      {signups.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-semibold">Signed Up Families</h3>
          <div className="grid gap-2">
            {signups.map((s) => (
              <div key={s.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm inline-flex items-center"><FamilyAvatar familyId={s.family.id} />{s.family.name}</span>
                    {s.vegetarians > 0 && <span className="text-xs text-emerald-400">🌿{s.vegetarians}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.family.contactName}{s.family.contactName2 ? ` & ${s.family.contactName2}` : ""}
                  </div>
                  <div className="text-xs mt-0.5">{emojiMembers(s.adults, s.kids, s.elderly)}</div>
                  {s.notes && <div className="text-xs text-muted-foreground mt-0.5 italic">{s.notes}</div>}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {(isOrganizer || s.familyId === currentFamilyId) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(s.familyId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signup Form trigger */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Sign Up a Family
        </Button>
      )}

      {/* Signup Form */}
      {showForm && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isEditing ? "Update Signup" : "Sign Up a Family"}</CardTitle>
          {!isEditing && (
            <p className="text-sm text-muted-foreground">Register a family on their behalf. Families can also sign up themselves using the invite link.</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 relative" ref={suggestionsRef}>
              <Label>Family Name</Label>
              <Input
                value={familyName}
                onChange={(e) => handleFamilyNameChange(e.target.value)}
                placeholder="e.g. Dangol Family"
                required
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                      onClick={() => selectSuggestion(f)}
                    >
                      <div className="font-medium inline-flex items-center"><FamilyAvatar familyId={f.id} />{f.name}</div>
                      <div className="text-xs text-muted-foreground">{f.contactName}{f.contactName2 ? ` & ${f.contactName2}` : ""}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>PayPal.me Username (optional)</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground shrink-0">paypal.me/</span>
                <Input
                  value={paypalMe}
                  onChange={(e) => setPaypalMe(e.target.value)}
                  placeholder="yourusername"
                />
              </div>
              <p className="text-xs text-muted-foreground">For easy PayPal payments in expense settlement</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adults</Label>
                <Input type="number" inputMode="numeric" min={0} value={adults} onFocus={(e) => e.target.select()} onChange={(e) => setAdults(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Kids</Label>
                <Input type="number" inputMode="numeric" min={0} value={kids} onFocus={(e) => e.target.select()} onChange={(e) => setKids(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Elderly</Label>
                <Input type="number" inputMode="numeric" min={0} value={elderly} onFocus={(e) => e.target.select()} onChange={(e) => setElderly(parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vegetarians</Label>
              <Input type="number" inputMode="numeric" min={0} value={vegetarians} onFocus={(e) => e.target.select()} onChange={(e) => setVegetarians(parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">
                If any of the above members are vegetarian, enter the count here. This does not add to the headcount.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dietary needs, allergies, etc." rows={2} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !familyName.trim() || !contactName.trim()}>
                {loading ? "Saving..." : isEditing ? "Update" : "Register"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        title="Remove signup?"
        description={
          pendingDeleteId === currentFamilyId
            ? "This will cancel your registration for this trip."
            : "This will remove the family's registration and all their headcount data for this trip."
        }
        onConfirm={confirmRemove}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
