"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCurrentGroup } from "@/hooks/use-current-group";
import { Settings, ArrowLeft, Trash2, AlertTriangle, MessageSquare } from "lucide-react";

export default function GroupSettingsPage() {
  const router = useRouter();
  const { groupId, groupName, isLoaded } = useCurrentGroup();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [feedbackList, setFeedbackList] = useState<Array<{
    id: number;
    message: string;
    page: string | null;
    familyName: string | null;
    createdAt: string;
  }>>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (isLoaded && groupName) {
      setName(groupName);
    }
  }, [isLoaded, groupName]);

  if (!isLoaded) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (!groupId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No group associated with this session. You&apos;re using the shared passcode login.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      setError("Current password is required to make changes");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() !== groupName ? name.trim() : undefined,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });

      if (res.ok) {
        setMessage("Settings updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        // If name changed, re-login might be needed
        const data = await res.json();
        if (data.name !== groupName) {
          setMessage("Group name updated! You may need to sign in again with the new name.");
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-lg font-semibold">Group Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {groupName}
          </CardTitle>
          <CardDescription>
            Manage your group name and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required to save changes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password (optional)</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-emerald-400">{message}</p>}

            <Button
              type="submit"
              disabled={saving || !currentPassword}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!showFeedback && feedbackList.length === 0) {
                  setFeedbackLoading(true);
                  try {
                    const res = await fetch("/api/feedback");
                    if (res.ok) setFeedbackList(await res.json());
                  } catch { /* ignore */ }
                  setFeedbackLoading(false);
                }
                setShowFeedback(!showFeedback);
              }}
            >
              {showFeedback ? "Hide" : "View"} Feedback
            </Button>
          </div>
          <CardDescription>
            Suggestions and feedback submitted by users
          </CardDescription>
        </CardHeader>
        {showFeedback && (
          <CardContent>
            {feedbackLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : feedbackList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedbackList.map((fb) => (
                  <div key={fb.id} className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm whitespace-pre-wrap flex-1">{fb.message}</p>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/feedback", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: fb.id }),
                            });
                            if (res.ok) {
                              setFeedbackList((prev) => prev.filter((f) => f.id !== fb.id));
                            }
                          } catch { /* ignore */ }
                        }}
                        className="text-muted-foreground hover:text-destructive shrink-0 p-0.5"
                        title="Delete feedback"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {fb.familyName && <span>{fb.familyName}</span>}
                      {fb.familyName && fb.page && <span>·</span>}
                      {fb.page && <span>{fb.page}</span>}
                      <span>·</span>
                      <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              className="border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Group
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-red-900/50 bg-red-950/20 p-4">
              <p className="text-sm text-red-300">
                This will permanently delete <strong>{groupName}</strong>, all families, events, and associated data. This cannot be undone.
              </p>
              <div className="space-y-2">
                <Label htmlFor="deletePassword" className="text-sm text-red-300">
                  Enter your group password to confirm
                </Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Group password"
                />
              </div>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={deleting || !deletePassword}
                  onClick={async () => {
                    setDeleting(true);
                    setDeleteError("");
                    try {
                      const res = await fetch(`/api/groups/${groupId}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ password: deletePassword }),
                      });
                      if (res.ok) {
                        router.push("/login");
                      } else {
                        const data = await res.json();
                        setDeleteError(data.error || "Failed to delete group");
                      }
                    } catch {
                      setDeleteError("Something went wrong");
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? "Deleting..." : "Yes, delete this group"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
