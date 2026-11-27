"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Star,
  Trash2,
  UserX,
  UserCheck,
  KeyRound,
  RefreshCw,
  LogOut,
  Disc,
  MessageSquare,
  Users,
  FileText,
  Sliders,
  History,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

type TabKey = "notes" | "users" | "mixtapes" | "settings" | "security" | "audit";

interface AdminReply {
  id: number;
  trackName: string;
  artistName: string;
  lyricExcerpt: string | null;
  senderHandle: string | null;
  createdAt: string;
}

interface AdminNote {
  id: number;
  recipient: string;
  message: string;
  moodColor: string;
  trackName: string;
  artistName: string;
  isFeatured: boolean;
  isHidden: boolean;
  moderationNote: string | null;
  createdAt: string;
  user: { id: number; username: string; monogramColor: string; isSuspended: boolean } | null;
  replies: AdminReply[];
  _count: { reactions: number; replies: number };
}

interface AdminUser {
  id: number;
  username: string;
  badge?: string | null;
  monogramColor: string;
  archetype: string;
  tags: string;
  bio: string;
  isSuspended: boolean;
  suspendedReason: string | null;
  createdAt: string;
  _count: { notes: number; mixtapes: number; followers: number };
}

interface AdminMixtape {
  id: number;
  title: string;
  subtitle: string;
  coverColor: string;
  creatorName: string;
  createdAt: string;
  user: { username: string } | null;
  _count: { items: number };
}

interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

interface DashboardData {
  admin: { username: string };
  metrics: {
    totalUsers: number;
    suspendedUsers: number;
    totalNotes: number;
    hiddenNotes: number;
    featuredNotes: number;
    totalReplies: number;
    totalReactions: number;
    totalMixtapes: number;
  };
  notes: AdminNote[];
  users: AdminUser[];
  mixtapes: AdminMixtape[];
  settings: {
    posting_locked: string;
    registration_locked: string;
    maintenance_banner: string;
  };
  auditLogs: AuditEntry[];
}

export default function SideBAdminPage() {
  const [authState, setAuthState] = useState<"checking" | "unauthenticated" | "authenticated">("checking");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [searchTerm, setSearchTerm] = useState("");
  const [noteFilter, setNoteFilter] = useState<"all" | "featured" | "hidden">("all");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [bannerDraft, setBannerDraft] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");

  const notify = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (res.status === 401) {
        setAuthState("unauthenticated");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const json: DashboardData = await res.json();
      setData(json);
      setBannerDraft(json.settings.maintenance_banner || "");
      setNewAdminUsername(json.admin.username);
      setAuthState("authenticated");
    } catch {
      setAuthState("unauthenticated");
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error || "Invalid credentials.");
        setAuthLoading(false);
        return;
      }
      setLoginPassword("");
      await loadDashboard();
    } catch {
      setAuthError("Network error during authentication.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setData(null);
    setAuthState("unauthenticated");
  };

  const runAction = async (key: string, payload: Record<string, unknown>, successMsg: string) => {
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error || "Action failed.");
      } else {
        notify("ok", successMsg);
        await loadDashboard();
      }
    } catch {
      notify("err", "Network error.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRotateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword && newAdminPassword !== confirmAdminPassword) {
      notify("err", "New passwords do not match.");
      return;
    }
    setBusyKey("rotate-creds");
    try {
      const res = await fetch("/api/admin/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newUsername: newAdminUsername,
          newPassword: newAdminPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error || "Failed to update credentials.");
      } else {
        setCurrentPassword("");
        setNewAdminPassword("");
        setConfirmAdminPassword("");
        notify("ok", `Admin credentials updated (@${json.username}). Old sessions invalidated.`);
        await loadDashboard();
      }
    } catch {
      notify("err", "Network error.");
    } finally {
      setBusyKey(null);
    }
  };

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111111] p-6 font-mono text-xs uppercase tracking-[0.2em] text-[#F4F4F0]">
        VERIFYING ADMIN CLEARANCE...
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col justify-between bg-[#111111] p-6 text-[#F4F4F0]">
        <div className="mx-auto flex w-full max-w-md items-center justify-between border-b border-neutral-800 pb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E11D2A]">
            ● SIDE B // RESTRICTED CONSOLE
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase opacity-70 hover:opacity-100"
          >
            <ArrowLeft className="h-3 w-3" /> ARCHIVE
          </Link>
        </div>

        <form
          onSubmit={handleLogin}
          className="mx-auto my-auto w-full max-w-md border border-neutral-700 bg-[#171717] p-6 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-neutral-800 pb-4">
            <div className="flex h-10 w-10 items-center justify-center border border-[#E11D2A] bg-[#E11D2A]/10 text-[#E11D2A]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">ADMIN ACCESS GATE</h1>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-60">
                HTTP-ONLY SIGNED SESSION // RATE-LIMITED
              </p>
            </div>
          </div>

          {authError && (
            <div className="mb-4 border border-[#E11D2A] bg-[#E11D2A]/15 px-3 py-2 font-mono text-xs text-[#FF8A92]">
              {authError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] opacity-75">
                ADMIN USERNAME
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin"
                className="w-full border border-neutral-700 bg-[#111111] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-[#E11D2A]"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] opacity-75">
                MASTER PASSKEY
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-neutral-700 bg-[#111111] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-[#E11D2A]"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full border border-[#E11D2A] bg-[#E11D2A] py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c81722] disabled:opacity-50"
            >
              {authLoading ? "AUTHENTICATING..." : "AUTHENTICATE SESSION"}
            </button>
          </div>
        </form>

        <p className="mx-auto w-full max-w-md text-center font-mono text-[10px] uppercase opacity-45">
          ALL FAILED & SUCCESSFUL ACCESS ATTEMPTS ARE LOGGED WITH IP METADATA.
        </p>
      </div>
    );
  }

  if (!data) return null;

  const q = searchTerm.trim().toLowerCase();

  const filteredNotes = data.notes.filter((n) => {
    if (noteFilter === "featured" && !n.isFeatured) return false;
    if (noteFilter === "hidden" && !n.isHidden) return false;
    if (!q) return true;
    return (
      n.recipient.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.trackName.toLowerCase().includes(q) ||
      n.artistName.toLowerCase().includes(q) ||
      (n.user?.username || "").toLowerCase().includes(q) ||
      String(n.id) === q
    );
  });

  const filteredUsers = data.users.filter((u) => {
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.archetype.toLowerCase().includes(q) ||
      u.tags.toLowerCase().includes(q) ||
      u.bio.toLowerCase().includes(q)
    );
  });

  const filteredMixtapes = data.mixtapes.filter((m) => {
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      m.subtitle.toLowerCase().includes(q) ||
      m.creatorName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F4F0] text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-[#111111] bg-[#111111] text-[#F4F4F0]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 bg-[#E11D2A]" />
            <span className="text-sm font-black uppercase tracking-tight">
              SIDE B // COMMAND CENTER
            </span>
            <span className="hidden border border-neutral-700 px-2 py-0.5 font-mono text-[10px] uppercase text-neutral-300 sm:inline">
              OPERATOR: @{data.admin.username}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 border border-neutral-700 px-2.5 py-1.5 font-mono text-[10px] uppercase hover:border-white"
            >
              <ArrowLeft className="h-3 w-3" /> PUBLIC SITE
            </Link>
            <button
              onClick={loadDashboard}
              className="inline-flex items-center gap-1.5 border border-neutral-700 px-2.5 py-1.5 font-mono text-[10px] uppercase hover:border-white"
            >
              <RefreshCw className="h-3 w-3" /> SYNC
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 border border-[#E11D2A] bg-[#E11D2A] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase text-white hover:bg-[#c81722]"
            >
              <LogOut className="h-3 w-3" /> LOCK
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div
            className={`flex items-center justify-between border px-4 py-2.5 font-mono text-xs ${
              toast.type === "ok"
                ? "border-[#111111] bg-white text-[#111111]"
                : "border-[#E11D2A] bg-[#E11D2A] text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {toast.text}
            </span>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-2 border-t border-l border-[#111111] bg-white sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "NOTES", val: data.metrics.totalNotes },
            { label: "FEATURED", val: data.metrics.featuredNotes },
            { label: "HIDDEN", val: data.metrics.hiddenNotes },
            { label: "REPLIES", val: data.metrics.totalReplies },
            { label: "SIGNALS", val: data.metrics.totalReactions },
            { label: "PROFILES", val: data.metrics.totalUsers },
            { label: "SUSPENDED", val: data.metrics.suspendedUsers },
            { label: "MIXTAPES", val: data.metrics.totalMixtapes },
          ].map((stat) => (
            <div key={stat.label} className="border-r border-b border-[#111111] p-3.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight">{stat.val}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#111111] pb-4">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "notes", label: "NOTES & REPLIES", icon: FileText },
                { id: "users", label: "USERS & ACCESS", icon: Users },
                { id: "mixtapes", label: "MIXTAPES", icon: Disc },
                { id: "settings", label: "SYSTEM LOCKS", icon: Sliders },
                { id: "security", label: "CREDENTIALS", icon: KeyRound },
                { id: "audit", label: "AUDIT LOG", icon: History },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                    active
                      ? "border-[#111111] bg-[#111111] text-white"
                      : "border-[#111111] bg-white text-[#111111] hover:bg-neutral-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {(activeTab === "notes" || activeTab === "users" || activeTab === "mixtapes") && (
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="FILTER BY HANDLE, TITLE, TRACK, ID..."
              className="w-full border border-[#111111] bg-white px-3 py-2 font-mono text-xs outline-none focus:border-[#E11D2A] sm:w-72"
            />
          )}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === "notes" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "featured", "hidden"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setNoteFilter(f)}
                  className={`border px-2.5 py-1 font-mono text-[10px] uppercase ${
                    noteFilter === f
                      ? "border-[#E11D2A] bg-[#E11D2A] text-white"
                      : "border-[#111111] bg-white"
                  }`}
                >
                  {f}
                </button>
              ))}
              <span className="font-mono text-[10px] uppercase opacity-60">
                SHOWING {filteredNotes.length} TRANSMISSIONS
              </span>
            </div>

            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className={`border border-[#111111] bg-white p-4 ${
                    note.isHidden ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase">
                        <span className="bg-[#111111] px-1.5 py-0.5 text-white">#{note.id}</span>
                        <span className="font-bold">TO: {note.recipient}</span>
                        <span>·</span>
                        <span>
                          BY: {note.user ? `@${note.user.username}` : "ANONYMOUS"}
                        </span>
                        {note.isFeatured && (
                          <span className="border border-[#111111] bg-amber-300 px-1.5 py-0.5 font-bold">
                            FEATURED
                          </span>
                        )}
                        {note.isHidden && (
                          <span className="bg-[#E11D2A] px-1.5 py-0.5 font-bold text-white">
                            HIDDEN
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-xs opacity-75">
                        {note.trackName} — {note.artistName} ({note._count.reactions} signals ·{" "}
                        {note._count.replies} replies)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        disabled={busyKey === `feat-${note.id}`}
                        onClick={() =>
                          runAction(
                            `feat-${note.id}`,
                            { action: "TOGGLE_FEATURE_NOTE", noteId: note.id },
                            note.isFeatured ? `Unfeatured Note #${note.id}` : `Featured Note #${note.id}`
                          )
                        }
                        className="inline-flex items-center gap-1 border border-[#111111] px-2.5 py-1 font-mono text-[10px] uppercase hover:bg-neutral-100"
                      >
                        <Star className="h-3 w-3" />
                        {note.isFeatured ? "UNFEATURE" : "FEATURE"}
                      </button>

                      <button
                        disabled={busyKey === `hide-${note.id}`}
                        onClick={() =>
                          runAction(
                            `hide-${note.id}`,
                            { action: "TOGGLE_HIDE_NOTE", noteId: note.id },
                            note.isHidden ? `Restored Note #${note.id}` : `Hidden Note #${note.id}`
                          )
                        }
                        className="inline-flex items-center gap-1 border border-[#111111] px-2.5 py-1 font-mono text-[10px] uppercase hover:bg-neutral-100"
                      >
                        {note.isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {note.isHidden ? "RESTORE" : "HIDE"}
                      </button>

                      <button
                        disabled={busyKey === `del-note-${note.id}`}
                        onClick={() => {
                          if (!confirm(`Permanently delete Note #${note.id}?`)) return;
                          runAction(
                            `del-note-${note.id}`,
                            { action: "DELETE_NOTE", noteId: note.id },
                            `Deleted Note #${note.id}`
                          );
                        }}
                        className="inline-flex items-center gap-1 border border-[#E11D2A] bg-[#E11D2A] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white hover:bg-[#c81722]"
                      >
                        <Trash2 className="h-3 w-3" /> DELETE
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{note.message}</p>

                  {note.replies.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-neutral-200 pt-3">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] opacity-60">
                        <MessageSquare className="mr-1 inline h-3 w-3" />
                        SONG REPLIES ({note.replies.length})
                      </p>
                      {note.replies.map((rep) => (
                        <div
                          key={rep.id}
                          className="flex items-center justify-between gap-2 border border-neutral-300 bg-[#F4F4F0] px-3 py-1.5 text-xs"
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-mono font-bold">
                              {rep.senderHandle ? `@${rep.senderHandle}` : "ANON"}:
                            </span>{" "}
                            <span>{rep.trackName}</span>
                            {rep.lyricExcerpt ? ` — "${rep.lyricExcerpt}"` : ""}
                          </div>
                          <button
                            onClick={() =>
                              runAction(
                                `del-rep-${rep.id}`,
                                { action: "DELETE_REPLY", replyId: rep.id },
                                `Deleted reply #${rep.id}`
                              )
                            }
                            className="shrink-0 font-mono text-[10px] font-bold uppercase text-[#E11D2A] hover:underline"
                          >
                            REMOVE
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 border border-[#111111] bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#111111] font-mono text-sm font-black text-white"
                    style={{ backgroundColor: user.monogramColor || "#111111" }}
                  >
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold">@{user.username}</span>
                      <span className="border border-neutral-300 px-1.5 py-0.5 font-mono text-[9px] uppercase">
                        {user.archetype}
                      </span>
                      {user.isSuspended && (
                        <span className="bg-[#E11D2A] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] opacity-70">
                      {user._count.notes} notes · {user._count.mixtapes} mixtapes ·{" "}
                      {user._count.followers} followers
                    </p>
                    {user.suspendedReason && (
                      <p className="mt-1 font-mono text-[10px] text-[#E11D2A]">
                        Reason: {user.suspendedReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      const reason = user.isSuspended
                        ? ""
                        : prompt(`Reason for suspending @${user.username}:`, "Policy violation") ||
                          "Suspended by administrator";
                      runAction(
                        `susp-${user.id}`,
                        { action: "TOGGLE_SUSPEND_USER", userId: user.id, reason },
                        user.isSuspended
                          ? `Reinstated @${user.username}`
                          : `Suspended @${user.username}`
                      );
                    }}
                    className="inline-flex items-center gap-1 border border-[#111111] px-2.5 py-1.5 font-mono text-[10px] uppercase hover:bg-neutral-100"
                  >
                    {user.isSuspended ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" /> REINSTATE
                      </>
                    ) : (
                      <>
                        <UserX className="h-3.5 w-3.5" /> SUSPEND
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const newPasscode = prompt(`Enter new passcode for @${user.username} (min 4 chars):`);
                      if (!newPasscode) return;
                      runAction(
                        `pass-${user.id}`,
                        { action: "RESET_USER_PASSCODE", userId: user.id, newPasscode },
                        `Updated passcode for @${user.username}`
                      );
                    }}
                    className="inline-flex items-center gap-1 border border-[#111111] px-2.5 py-1.5 font-mono text-[10px] uppercase hover:bg-neutral-100"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> RESET PASS
                  </button>

                  <button
                    onClick={() => {
                      if (!confirm(`Permanently delete @${user.username} and unlink their notes?`)) return;
                      runAction(
                        `del-u-${user.id}`,
                        { action: "DELETE_USER", userId: user.id },
                        `Deleted @${user.username}`
                      );
                    }}
                    className="inline-flex items-center gap-1 border border-[#E11D2A] bg-[#E11D2A] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase text-white hover:bg-[#c81722]"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "mixtapes" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMixtapes.map((mix) => (
              <div
                key={mix.id}
                className="flex flex-col justify-between border border-[#111111] bg-white p-4"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase opacity-65">
                    <span>TAPE #{mix.id}</span>
                    <span>{mix._count.items} TRACKS</span>
                  </div>
                  <h3 className="mt-1.5 text-base font-black uppercase">{mix.title}</h3>
                  {mix.subtitle && <p className="mt-1 text-xs opacity-75">{mix.subtitle}</p>}
                  <p className="mt-2 font-mono text-[10px] uppercase opacity-60">
                    CURATOR: {mix.user ? `@${mix.user.username}` : mix.creatorName}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!confirm(`Delete mixtape "${mix.title}"?`)) return;
                    runAction(
                      `del-mix-${mix.id}`,
                      { action: "DELETE_MIXTAPE", mixtapeId: mix.id },
                      `Deleted mixtape "${mix.title}"`
                    );
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 border border-[#E11D2A] py-1.5 font-mono text-[10px] font-bold uppercase text-[#E11D2A] hover:bg-[#E11D2A] hover:text-white"
                >
                  <Trash2 className="h-3 w-3" /> REMOVE MIXTAPE
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between border border-[#111111] bg-white p-4">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase">ARCHIVE POSTING LOCK</h3>
                <p className="mt-1 text-xs opacity-75">
                  Freeze all new public note submissions while keeping the archive readable.
                </p>
              </div>
              <button
                onClick={() => {
                  const next = data.settings.posting_locked === "true" ? "false" : "true";
                  runAction(
                    "lock-post",
                    { action: "UPDATE_SETTINGS", settings: { posting_locked: next } },
                    next === "true" ? "Posting locked." : "Posting unlocked."
                  );
                }}
                className={`inline-flex items-center gap-1.5 border px-3 py-2 font-mono text-[10px] font-bold uppercase ${
                  data.settings.posting_locked === "true"
                    ? "border-[#E11D2A] bg-[#E11D2A] text-white"
                    : "border-[#111111] bg-white"
                }`}
              >
                {data.settings.posting_locked === "true" ? (
                  <>
                    <Lock className="h-3.5 w-3.5" /> LOCKED
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> OPEN
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between border border-[#111111] bg-white p-4">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase">PROFILE REGISTRATION LOCK</h3>
                <p className="mt-1 text-xs opacity-75">
                  Prevent new listener handles from being claimed while allowing existing sign-ins.
                </p>
              </div>
              <button
                onClick={() => {
                  const next = data.settings.registration_locked === "true" ? "false" : "true";
                  runAction(
                    "lock-reg",
                    { action: "UPDATE_SETTINGS", settings: { registration_locked: next } },
                    next === "true" ? "Registrations locked." : "Registrations unlocked."
                  );
                }}
                className={`inline-flex items-center gap-1.5 border px-3 py-2 font-mono text-[10px] font-bold uppercase ${
                  data.settings.registration_locked === "true"
                    ? "border-[#E11D2A] bg-[#E11D2A] text-white"
                    : "border-[#111111] bg-white"
                }`}
              >
                {data.settings.registration_locked === "true" ? (
                  <>
                    <Lock className="h-3.5 w-3.5" /> LOCKED
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> OPEN
                  </>
                )}
              </button>
            </div>

            <div className="border border-[#111111] bg-white p-4">
              <h3 className="font-mono text-xs font-bold uppercase">SYSTEM STATUS / NOTICE</h3>
              <p className="mt-1 text-xs opacity-75">
                Store an internal or public maintenance notice in system configuration.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={bannerDraft}
                  onChange={(e) => setBannerDraft(e.target.value)}
                  placeholder="e.g. Scheduled archive maintenance at 03:00 UTC"
                  className="flex-1 border border-[#111111] px-3 py-2 font-mono text-xs outline-none focus:border-[#E11D2A]"
                />
                <button
                  onClick={() =>
                    runAction(
                      "save-banner",
                      { action: "UPDATE_SETTINGS", settings: { maintenance_banner: bannerDraft } },
                      "System notice updated."
                    )
                  }
                  className="border border-[#111111] bg-[#111111] px-4 py-2 font-mono text-[10px] font-bold uppercase text-white"
                >
                  SAVE
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <form
            onSubmit={handleRotateCredentials}
            className="max-w-lg space-y-4 border border-[#111111] bg-white p-6"
          >
            <div className="border-b border-neutral-200 pb-3">
              <h2 className="text-base font-black uppercase">ROTATE ADMIN CREDENTIALS</h2>
              <p className="mt-1 font-mono text-[11px] opacity-70">
                Updating your username or master passkey hashes the password with a fresh scrypt
                salt and immediately revokes all older admin sessions.
              </p>
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase">
                CURRENT MASTER PASSKEY (REQUIRED)
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-[#111111] px-3 py-2 font-mono text-sm outline-none focus:border-[#E11D2A]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase">
                ADMIN USERNAME
              </label>
              <input
                type="text"
                required
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                className="w-full border border-[#111111] px-3 py-2 font-mono text-sm outline-none focus:border-[#E11D2A]"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase">
                NEW PASSKEY (LEAVE BLANK TO KEEP CURRENT)
              </label>
              <input
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Minimum 10 characters"
                className="w-full border border-[#111111] px-3 py-2 font-mono text-sm outline-none focus:border-[#E11D2A]"
              />
            </div>

            {newAdminPassword && (
              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase">
                  CONFIRM NEW PASSKEY
                </label>
                <input
                  type="password"
                  required
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  className="w-full border border-[#111111] px-3 py-2 font-mono text-sm outline-none focus:border-[#E11D2A]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busyKey === "rotate-creds"}
              className="w-full border border-[#111111] bg-[#111111] py-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-[#E11D2A] hover:border-[#E11D2A]"
            >
              {busyKey === "rotate-creds" ? "ROTATING..." : "SAVE & ROTATE SESSION"}
            </button>
          </form>
        )}

        {activeTab === "audit" && (
          <div className="overflow-x-auto border border-[#111111] bg-white">
            <table className="w-full border-collapse text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#111111] bg-[#111111] text-[10px] uppercase text-white">
                  <th className="p-3">TIMESTAMP</th>
                  <th className="p-3">ACTOR</th>
                  <th className="p-3">ACTION</th>
                  <th className="p-3">TARGET</th>
                  <th className="p-3">DETAILS</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-neutral-200 align-top">
                    <td className="whitespace-nowrap p-3 text-[11px] opacity-70">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold">@{log.actor}</td>
                    <td className="p-3">
                      <span className="border border-[#111111] px-1.5 py-0.5 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-[11px]">
                      {log.targetType}:{log.targetId}
                    </td>
                    <td className="p-3 text-[11px] opacity-80">{log.details}</td>
                    <td className="p-3 text-[11px] opacity-60">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
