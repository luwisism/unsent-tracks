"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  X,
  Edit3,
  UserPlus,
  UserCheck,
  Activity as ActivityIcon,
  FileText,
  Users,
  Pin,
  Download,
  QrCode,
  Volume2,
  MapPin,
  Clock,
} from "lucide-react";
import { Note, UserProfile } from "../types/archive";
import {
  downloadSwissProfilePoster,
  formatIndex,
  getContrastText,
  getMonogram,
} from "../utils/poster";

interface ProfileModalProps {
  profile: UserProfile & {
    anthemArtist?: string | null;
    anthemPreview?: string | null;
    frequency?: string;
    pinnedNoteId?: number | null;
  };
  currentUser: UserProfile | null;
  isPlaying: boolean;
  playingTrackId: string | null;
  progress: number;
  currentTime: number;
  onPlayPreview: (url: string | null | undefined, trackId: string, start?: number, end?: number) => void;
  onSeekAudio: (pct: number) => void;
  onEdit: () => void;
  onSelectNote: (note: Note) => void;
  onPinChanged?: (pinnedNoteId: number | null) => void;
  onClose: () => void;
}

interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  noteId: number | null;
  target: string | null;
  createdAt: string;
}

interface MiniUser {
  id: number;
  username: string;
  badge?: string | null;
  monogramColor: string;
}

const WAVEFORM_BARS = [
  42, 68, 50, 88, 96, 58, 74, 44, 90, 62,
  52, 94, 80, 48, 70, 100, 76, 54, 84, 60,
  46, 92, 68, 56, 82, 95, 64, 50, 78, 86,
];

function formatRelativeTime(iso: string): string {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}S AGO`;
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

export default function ProfileModal({
  profile,
  currentUser,
  isPlaying,
  playingTrackId,
  progress,
  currentTime,
  onPlayPreview,
  onSeekAudio,
  onEdit,
  onSelectNote,
  onPinChanged,
  onClose,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"NOTES" | "ACTIVITY" | "NETWORK">("NOTES");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [followersList, setFollowersList] = useState<MiniUser[]>([]);
  const [followingList, setFollowingList] = useState<MiniUser[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [pinnedNoteId, setPinnedNoteId] = useState<number | null>(
    profile.pinnedNoteId ?? null
  );
  const [pinBusy, setPinBusy] = useState(false);
  const [exportingPoster, setExportingPoster] = useState(false);

  const isOwnProfile = currentUser?.username === profile.username;
  const surfaceBg = profile.monogramColor || "#111111";
  const fg = getContrastText(surfaceBg);
  const isLightSurface = fg === "#111111";

  useEffect(() => {
    setPinnedNoteId(profile.pinnedNoteId ?? null);
  }, [profile.pinnedNoteId, profile.username]);

  useEffect(() => {
    let mounted = true;
    setLoadingFeed(true);
    const viewerParam = currentUser?.id ? `?viewerId=${currentUser.id}` : "";
    fetch(`/api/users/${encodeURIComponent(profile.username)}/activity${viewerParam}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        setFollowersCount(data.followersCount ?? 0);
        setFollowingCount(data.followingCount ?? 0);
        setIsFollowing(Boolean(data.isFollowing));
        setActivities(data.activities || []);
        setFollowersList(data.followers || []);
        setFollowingList(data.following || []);
      })
      .finally(() => {
        if (mounted) setLoadingFeed(false);
      });
    return () => {
      mounted = false;
    };
  }, [profile.username, currentUser?.id]);

  const handleToggleFollow = async () => {
    if (!currentUser || isOwnProfile || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(profile.username)}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: currentUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(Boolean(data.following));
        setFollowersCount((prev) => (data.following ? prev + 1 : Math.max(0, prev - 1)));
      }
    } finally {
      setFollowBusy(false);
    }
  };

  const handleTogglePinNote = async (noteId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwnProfile || pinBusy) return;
    const nextPinned = pinnedNoteId === noteId ? null : noteId;
    setPinBusy(true);
    setPinnedNoteId(nextPinned);
    try {
      await fetch(`/api/users/${encodeURIComponent(profile.username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedNoteId: nextPinned }),
      });
      onPinChanged?.(nextPinned);
    } finally {
      setPinBusy(false);
    }
  };

  const tags = (profile.tags || profile.archetype || "ARCHIVE")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const notes = profile.notes || [];
  const pinnedNote = notes.find((n) => n.id === pinnedNoteId) || null;

  const anthemArtist = profile.anthemArtist || profile.anthemArtist || "";
  const anthemPreview = profile.anthemPreview || profile.anthemPreview || null;
  const anthemTrackKey = `anthem-${profile.id}`;
  const isAnthemActive = playingTrackId === anthemTrackKey;
  const anthemPct = isAnthemActive ? progress : 0;

  const handleExport9x16 = async () => {
    setExportingPoster(true);
    try {
      await downloadSwissProfilePoster(
        profile,
        {
          notesCount: notes.length,
          followersCount,
          followingCount,
        },
        pinnedNote
      );
    } finally {
      setExportingPoster(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-dvh w-full max-w-none flex-col overflow-y-auto md:overflow-hidden border-0 sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:border-2 sm:border-[#111111] bg-[#F4F4F0] text-[#111111] sm:shadow-[10px_10px_0px_#111111] md:grid md:grid-cols-10"
      >
        {/* LEFT 70% (7 COLS): USER IDENTITY IN CHOSEN COLOR + ANTHEM + PIN */}
        <div
          style={{ backgroundColor: surfaceBg, color: fg }}
          className="flex min-h-0 flex-col justify-between overflow-y-auto p-6 sm:p-8 md:col-span-7 md:max-h-[92vh] md:border-r-2 md:border-[#111111]"
        >
          <div>
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/25 pb-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
                SIDE B // IDENTITY FREQUENCY
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExport9x16}
                  disabled={exportingPoster}
                  title="Download 9:16 Profile Card with QR Code"
                  className="flex h-8 items-center gap-1.5 border border-current px-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition hover:bg-current/15"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <Download className="h-3 w-3" />
                  <span>{exportingPoster ? "RENDERING..." : "9:16 QR CARD"}</span>
                </button>

                {isOwnProfile ? (
                  <button
                    onClick={onEdit}
                    className="flex h-8 items-center gap-1.5 border border-current px-2.5 font-mono text-[10px] font-bold uppercase transition hover:bg-current/15"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                ) : currentUser ? (
                  <button
                    onClick={handleToggleFollow}
                    disabled={followBusy}
                    className={`flex h-8 items-center gap-1.5 border border-current px-3 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      isFollowing
                        ? "bg-transparent hover:bg-current/15"
                        : isLightSurface
                        ? "bg-[#111111] text-white"
                        : "bg-white text-[#111111]"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Follow
                      </>
                    )}
                  </button>
                ) : null}

                <button
                  onClick={onClose}
                  aria-label="Close Profile"
                  className="flex md:hidden h-8 w-8 items-center justify-center border border-current hover:bg-current/15"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Monogram + Handle + Metadata */}
            <div className="mt-6 flex items-start gap-4 sm:gap-5">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center border-2 border-current font-mono text-2xl sm:text-3xl font-bold tracking-tighter">
                {getMonogram(profile.username)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-current/45 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <h2 className="mt-2 break-all text-2xl sm:text-4xl font-bold tracking-tight">
                  @{profile.username}
                </h2>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase opacity-80">
                  {profile.coordinates && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {profile.coordinates}
                    </span>
                  )}
                  {(profile.frequency || profile.frequency) && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {profile.frequency || profile.frequency}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-5 text-sm sm:text-base leading-relaxed opacity-95">
                {profile.bio}
              </p>
            )}

            {/* Compact Icon-Paired Stats */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setActiveTab("NOTES")}
                className="inline-flex items-center gap-1.5 border border-current/40 bg-current/5 px-3 py-1.5 font-mono text-xs font-bold uppercase transition hover:bg-current/15"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{notes.length}</span>
                <span className="text-[10px] opacity-75">NOTES</span>
              </button>

              <button
                onClick={() => setActiveTab("NETWORK")}
                className="inline-flex items-center gap-1.5 border border-current/40 bg-current/5 px-3 py-1.5 font-mono text-xs font-bold uppercase transition hover:bg-current/15"
              >
                <Users className="h-3.5 w-3.5" />
                <span>{followersCount}</span>
                <span className="text-[10px] opacity-75">FOLLOWERS</span>
              </button>

              <button
                onClick={() => setActiveTab("NETWORK")}
                className="inline-flex items-center gap-1.5 border border-current/40 bg-current/5 px-3 py-1.5 font-mono text-xs font-bold uppercase transition hover:bg-current/15"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{followingCount}</span>
                <span className="text-[10px] opacity-75">FOLLOWING</span>
              </button>
            </div>

            {/* Pinned Note Showcase (1 Pinned Note) */}
            {pinnedNote ? (
              <div className="mt-6 border border-current/45 bg-current/10 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest">
                    <Pin className="h-3 w-3 fill-current" /> PINNED TRANSMISSION // NO.
                    {formatIndex(pinnedNote.id)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onSelectNote(pinnedNote);
                      }}
                      className="border border-current px-2 py-0.5 font-mono text-[9px] font-bold uppercase hover:bg-current/15"
                    >
                      OPEN NOTE
                    </button>
                    {isOwnProfile && (
                      <button
                        onClick={(e) => handleTogglePinNote(pinnedNote.id, e)}
                        className="font-mono text-[9px] uppercase underline opacity-75 hover:opacity-100"
                      >
                        UNPIN
                      </button>
                    )}
                  </div>
                </div>

                <p className="font-mono text-[10px] font-bold uppercase opacity-75">
                  TO: {pinnedNote.recipient}
                </p>
                <p className="mt-1 line-clamp-3 text-sm sm:text-base font-medium leading-snug">
                  “{pinnedNote.message}”
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase opacity-80">
                  ♪ {pinnedNote.trackName} — {pinnedNote.artistName}
                </p>
              </div>
            ) : isOwnProfile && notes.length > 0 ? (
              <div className="mt-6 border border-dashed border-current/40 p-3.5 font-mono text-[10px] uppercase opacity-75">
                TIP: PIN ONE TRANSMISSION FROM YOUR ARCHIVE LIST ON THE RIGHT TO FEATURE IT HERE.
              </div>
            ) : null}
          </div>

          {/* Playable Profile Anthem with Interactive Progress Scrubber */}
          {profile.anthemTrackName && (
            <div className="mt-6 border-2 border-current bg-current/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {profile.anthemAlbumArt && (
                    <img
                      src={profile.anthemAlbumArt}
                      alt=""
                      className="h-12 w-12 shrink-0 border border-current object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest opacity-80">
                      <Volume2 className="h-3 w-3" /> SIGNATURE PROFILE ANTHEM
                    </p>
                    <p className="truncate text-sm font-bold">{profile.anthemTrackName}</p>
                    <p className="truncate text-xs opacity-80">{anthemArtist}</p>
                  </div>
                </div>

                {anthemPreview && (
                  <button
                    onClick={() => onPlayPreview(anthemPreview, anthemTrackKey, 0, 30)}
                    className={`flex h-9 shrink-0 items-center gap-1.5 border border-current px-3.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      isLightSurface
                        ? "bg-[#111111] text-white hover:bg-[#E11D2A]"
                        : "bg-white text-[#111111] hover:bg-[#E11D2A] hover:text-white"
                    }`}
                  >
                    {isPlaying && isAnthemActive ? (
                      <>
                        <Pause className="h-3.5 w-3.5 fill-current" /> PAUSE
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" /> PLAY
                      </>
                    )}
                  </button>
                )}
              </div>

              {anthemPreview && (
                <div className="mt-3.5">
                  <div
                    onClick={(e) => {
                      if (!isAnthemActive) {
                        onPlayPreview(anthemPreview, anthemTrackKey, 0, 30);
                        return;
                      }
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.max(
                        0,
                        Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
                      );
                      onSeekAudio(pct);
                    }}
                    title="Click to scrub"
                    className="flex h-7 cursor-pointer items-end gap-[3px] pt-1"
                  >
                    {WAVEFORM_BARS.map((heightPct, idx) => {
                      const barPct = ((idx + 1) / WAVEFORM_BARS.length) * 100;
                      const filled = isAnthemActive && barPct <= anthemPct;
                      return (
                        <div
                          key={idx}
                          style={{ height: `${heightPct}%` }}
                          className={`flex-1 transition-all duration-100 ${
                            filled ? "bg-current" : "bg-current/25"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-[9px] uppercase opacity-75">
                    <span>{isPlaying && isAnthemActive ? "TRANSMITTING ANTHEM" : "READY"}</span>
                    <span>
                      0:{String(Math.floor(isAnthemActive ? currentTime : 0)).padStart(2, "0")} /
                      0:30
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT 30% (3 COLS): ARCHIVE TABS (NOTES DEFAULT / ACTIVITY / NETWORK) */}
        <div className="flex max-h-[55vh] md:max-h-[92vh] flex-col bg-[#F4F4F0] md:col-span-3">
          <div className="hidden md:flex items-center justify-between border-b border-[#111111] bg-white px-4 py-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              ARCHIVE DRAWER
            </span>
            <button
              onClick={onClose}
              aria-label="Close Profile"
              className="flex h-7 w-7 items-center justify-center border border-[#111111] bg-white hover:bg-[#111111] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 border-b border-[#111111] bg-white">
            <button
              onClick={() => setActiveTab("NOTES")}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider transition ${
                activeTab === "NOTES"
                  ? "bg-[#111111] text-white"
                  : "text-[#111111] hover:bg-neutral-100"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Notes ({notes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("ACTIVITY")}
              className={`flex flex-col items-center justify-center gap-0.5 border-x border-[#111111] py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider transition ${
                activeTab === "ACTIVITY"
                  ? "bg-[#111111] text-white"
                  : "text-[#111111] hover:bg-neutral-100"
              }`}
            >
              <ActivityIcon className="h-3.5 w-3.5" />
              <span>Activity ({activities.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("NETWORK")}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-wider transition ${
                activeTab === "NETWORK"
                  ? "bg-[#111111] text-white"
                  : "text-[#111111] hover:bg-neutral-100"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Network ({followersCount + followingCount})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5">
            {activeTab === "NOTES" && (
              <div className="space-y-2.5">
                {notes.length === 0 ? (
                  <div className="border border-dashed border-[#111111] bg-white pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 text-center font-mono text-[10px] uppercase text-neutral-500">
                    NO TRANSMISSIONS ARCHIVED YET.
                  </div>
                ) : (
                  notes.map((n) => {
                    const isPinned = pinnedNoteId === n.id;
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          onClose();
                          onSelectNote(n);
                        }}
                        className={`group cursor-pointer border p-3 transition ${
                          isPinned
                            ? "border-2 border-[#E11D2A] bg-white"
                            : "border-[#111111] bg-white hover:bg-[#111111] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 font-mono text-[9px] font-bold uppercase">
                          <span className="truncate opacity-70">
                            {formatIndex(n.id)} • TO: {n.recipient}
                          </span>
                          {isOwnProfile ? (
                            <button
                              type="button"
                              onClick={(e) => handleTogglePinNote(n.id, e)}
                              title={isPinned ? "Unpin Note" : "Pin Note to Profile"}
                              className={`inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[8px] font-bold uppercase transition ${
                                isPinned
                                  ? "border-[#E11D2A] bg-[#E11D2A] text-white"
                                  : "border-current/40 opacity-75 hover:opacity-100"
                              }`}
                            >
                              <Pin className="h-2.5 w-2.5" />
                              {isPinned ? "PINNED" : "PIN"}
                            </button>
                          ) : isPinned ? (
                            <span className="inline-flex shrink-0 items-center gap-1 bg-[#E11D2A] px-1.5 py-0.5 text-[8px] text-white">
                              <Pin className="h-2.5 w-2.5" /> PINNED
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">
                          “{n.message}”
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          {n.albumArt && (
                            <img
                              src={n.albumArt}
                              alt=""
                              className="h-6 w-6 shrink-0 border border-current/25 object-cover"
                            />
                          )}
                          <p className="truncate font-mono text-[9px] opacity-75">
                            ♪ {n.trackName}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "ACTIVITY" && (
              <div className="space-y-2">
                {loadingFeed ? (
                  <div className="border border-[#111111] bg-white pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 text-center font-mono text-[10px] uppercase text-neutral-500">
                    LOADING LOG...
                  </div>
                ) : activities.length === 0 ? (
                  <div className="border border-dashed border-[#111111] bg-white pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 text-center font-mono text-[10px] uppercase text-neutral-500">
                    NO RECENT ACTIVITY.
                  </div>
                ) : (
                  activities.map((item) => {
                    const linkedNote = item.noteId
                      ? notes.find((n) => n.id === item.noteId)
                      : null;
                    return (
                      <div
                        key={item.id}
                        className="border border-[#111111] bg-white p-2.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${
                              item.type === "POSTED"
                                ? "bg-[#E11D2A] text-white"
                                : item.type === "FOLLOWED"
                                ? "bg-[#0047AB] text-white"
                                : "bg-[#111111] text-white"
                            }`}
                          >
                            {item.type.replace("_", " ")}
                          </span>
                          <span className="font-mono text-[8px] uppercase text-neutral-500">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-snug text-[#111111]">
                          {item.summary}
                        </p>
                        {linkedNote && (
                          <button
                            onClick={() => {
                              onClose();
                              onSelectNote(linkedNote);
                            }}
                            className="mt-1.5 border border-[#111111] px-2 py-0.5 font-mono text-[8px] font-bold uppercase hover:bg-[#111111] hover:text-white"
                          >
                            OPEN NOTE
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "NETWORK" && (
              <div className="space-y-3">
                <div className="border border-[#111111] bg-white p-3">
                  <p className="mb-2 border-b border-[#111111] pb-1 font-mono text-[9px] font-bold uppercase tracking-widest">
                    FOLLOWERS ({followersList.length})
                  </p>
                  {followersList.length === 0 ? (
                    <p className="font-mono text-[9px] uppercase text-neutral-500">
                      NO FOLLOWERS YET.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {followersList.map((u, idx) => (
                        <div key={`follower-${u.id}-${idx}`} className="flex items-center gap-2">
                          <span
                            style={{
                              backgroundColor: u.monogramColor,
                              color: getContrastText(u.monogramColor),
                            }}
                            className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#111111] font-mono text-[8px] font-bold"
                          >
                            {getMonogram(u.username)}
                          </span>
                          <span className="truncate font-mono text-[11px] font-bold">
                            @{u.username}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-[#111111] bg-white p-3">
                  <p className="mb-2 border-b border-[#111111] pb-1 font-mono text-[9px] font-bold uppercase tracking-widest">
                    FOLLOWING ({followingList.length})
                  </p>
                  {followingList.length === 0 ? (
                    <p className="font-mono text-[9px] uppercase text-neutral-500">
                      NOT FOLLOWING ANYONE YET.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {followingList.map((u, idx) => (
                        <div key={`following-${u.id}-${idx}`} className="flex items-center gap-2">
                          <span
                            style={{
                              backgroundColor: u.monogramColor,
                              color: getContrastText(u.monogramColor),
                            }}
                            className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#111111] font-mono text-[8px] font-bold"
                          >
                            {getMonogram(u.username)}
                          </span>
                          <span className="truncate font-mono text-[11px] font-bold">
                            @{u.username}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
