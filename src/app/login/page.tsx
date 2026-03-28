"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MountainSnow, Plus, Users, Tent, TreePine, Flame, Fish, Compass, TentTree, Binoculars, Mountain } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CAMPING_ICONS: LucideIcon[] = [Tent, TreePine, Flame, Fish, Compass, TentTree, Binoculars, Mountain, MountainSnow];

type GroupInfo = { id: number; name: string };

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "create">("login");
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(() => {});
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: groupName.trim(), password }),
      });
      if (res.ok) {
        router.push("/select-family");
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error || "Invalid credentials. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim() || !password.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create group");
        setLoading(false);
        return;
      }

      // Auto-login after creating group
      const loginRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: groupName.trim(), password }),
      });

      if (loginRes.ok) {
        router.push("/select-family");
      } else {
        setError("Group created but login failed. Please sign in.");
        setMode("login");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectGroup(name: string) {
    setGroupName(name);
    setMode("login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <MountainSnow className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Nepali Camping</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in with your group name and password"
              : "Create a new camping group"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing groups list */}
          {groups.length > 0 && mode === "login" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Existing Groups
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g, i) => {
                  const Icon = CAMPING_ICONS[i % CAMPING_ICONS.length];
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectGroup(g.name)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                        groupName === g.name
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={mode === "login" ? handleLogin : handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="e.g. Nepali Campers"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === "create" ? "Choose a password" : "Enter password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !password || !groupName.trim()}>
              {loading
                ? mode === "login" ? "Signing in..." : "Creating..."
                : mode === "login" ? "Sign In" : "Create Group & Sign In"}
            </Button>
          </form>

          <div className="text-center">
            {mode === "login" ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setMode("create"); setError(""); }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create a new group
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setMode("login"); setError(""); }}
              >
                Already have a group? Sign in
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
