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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tent, Plus, Users, Check, Lock, Pencil } from "lucide-react";
import type { FamilyPublic } from "@/types";

function SelectFamilyContent() {
  const [families, setFamilies] = useState<FamilyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState("");
  const [contactNameInput, setContactNameInput] = useState("");
  const [contactName2Input, setContactName2Input] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [creating, setCreating] = useState(false);

  // PIN verification state
  const [verifyingFamily, setVerifyingFamily] = useState<FamilyPublic | null>(
    null
  );
  const [verifyPin, setVerifyPin] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Edit family state
  const [editingFamily, setEditingFamily] = useState<FamilyPublic | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editContact2, setEditContact2] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  const fetchFamilies = () => {
    fetch("/api/families")
      .then((r) => r.json())
      .then(setFamilies)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFamilies();
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
          contactName2: contactName2Input.trim() || null,
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

  // --- Edit family ---

  async function openEdit(family: FamilyPublic, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/families/${family.id}`);
    const data = await res.json();
    setEditingFamily(family);
    setEditName(data.name || "");
    setEditContact(data.contactName || "");
    setEditContact2(data.contactName2 || "");
    setEditPhone(data.phone || "");
    setEditEmail(data.email || "");
    setEditPin("");
    setDeleteError("");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFamily || !editName.trim() || !editContact.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/families", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingFamily.id,
          name: editName.trim(),
          contactName: editContact.trim(),
          contactName2: editContact2.trim() || null,
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
          ...(editPin ? { pin: editPin } : {}),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (familyId === editingFamily.id) {
          setCurrentFamily(updated.id, updated.name);
        }
        setEditingFamily(null);
        fetchFamilies();
      }
    } catch {
      // silently fail
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingFamily) return;
    if (!confirm(`Delete "${editingFamily.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/families/${editingFamily.id}`, { method: "DELETE" });
      if (res.ok) {
        if (familyId === editingFamily.id) {
          setCurrentFamily(0, "");
        }
        setEditingFamily(null);
        fetchFamilies();
      } else {
        const data = await res.json();
        if (data.reasons) {
          setDeleteError(data.reasons.join(", "));
        } else {
          setDeleteError(data.error || "Failed to delete");
        }
      }
    } catch {
      setDeleteError("Something went wrong");
    } finally {
      setDeleting(false);
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
                    <div key={family.id} className="flex items-center gap-1">
                      <button
                        onClick={() => handleSelect(family)}
                        className="flex-1 flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-green-50 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      {familyId === family.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={(e) => openEdit(family, e)}
                          title="Edit family"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
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
                        <Label htmlFor="contactName2">Second Contact (optional)</Label>
                        <Input
                          id="contactName2"
                          placeholder="e.g. Sita Dangol"
                          value={contactName2Input}
                          onChange={(e) => setContactName2Input(e.target.value)}
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

        {/* Edit Family Dialog */}
        <Dialog open={!!editingFamily} onOpenChange={(open) => !open && setEditingFamily(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Family</DialogTitle>
              <DialogDescription>
                Update your family details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Family Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact">Contact Person</Label>
                <Input
                  id="edit-contact"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact2">Second Contact (optional)</Label>
                <Input
                  id="edit-contact2"
                  value={editContact2}
                  onChange={(e) => setEditContact2(e.target.value)}
                  placeholder="e.g. Sita Dangol"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pin">
                  Change PIN {editingFamily?.hasPin ? "(leave blank to keep current)" : "(optional)"}
                </Label>
                <Input
                  id="edit-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder={editingFamily?.hasPin ? "Enter new 4-digit PIN" : "Set a 4-digit PIN"}
                  value={editPin}
                  onChange={(e) =>
                    setEditPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
              </div>
              <DialogFooter className="flex-col gap-3 sm:flex-col">
                <div className="flex gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingFamily(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={editSaving || !editName.trim() || !editContact.trim()}
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
                <div className="w-full border-t pt-3">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? "Deleting..." : "Delete Family"}
                  </Button>
                  {deleteError && (
                    <p className="text-xs text-red-600 mt-2">
                      Cannot delete: {deleteError}
                    </p>
                  )}
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
