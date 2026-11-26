"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  X,
  Download,
  Share2,
  Check,
  Disc,
  Send,
  Flame,
  KeyRound,
  MessageSquare,
} from "lucide-react";
import { Note, SIGNAL_TYPES, Track, UserProfile } from "../types/archive";
import { downloadSwissPoster, getContrastText } from "../utils/poster";

interface ReaderModalProps {
  note: Note;
  currentUser: UserProfile | null;
  currentTime: number;
  isPlaying: boolean;
  playingTrackId: string | null;
  progress: number;
  sentSignals: Record<string, boolean>;
  onSendSignal: (noteId: number, type: string) => void;
  onPlayPreview: (url: string | null, trackId: string, start: number, end: number) => void;
  onSeekAudio: (pct: number) => void;
  onNoteUnlocked: (noteId: number, message: string, lyricExcerpt: string | null) => void;
  onReplyAdded: (noteId: number, reply: unknown) => void;
  onClose: () => void;
}

// Deterministic architectural bar heights for the Swiss tape waveform scrubber
const WAVEFORM_BARS = [
  38, 62, 48, 85, 95, 55, 72, 40, 88, 64,
  50, 92, 78, 44, 68, 100, 74, 52, 84, 60,
  45, 90, 70, 56, 82, 96, 62, 48, 76, 88,
  54, 66, 92, 58, 74, 46, 80, 64, 52, 40,
];

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `0:${String(s).padStart(2, "0")}`;
}

export default function ReaderModal({
  note,
  currentUser,
  currentTime,
  isPlaying,
  playingTrackId,
  progress,
  sentSignals,
  onSendSignal,
  onPlayPreview,
  onSeekAudio,
  onNoteUnlocked,
  onReplyAdded,
  onClose,
}: ReaderModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  // Passcode Unlock State
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // Reply State (Song Only, Text Only, or Both)
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyMode, setReplyMode] = useState<"BOTH" | "SONG" | "TEXT">("BOTH");
  const [replySongQuery, setReplySongQuery] = useState("");
  const [replySongResults, setReplySongResults] = useState<Track[]>([]);
  const [selectedReplyTrack, setSelectedReplyTrack] = useState<Track | null>(null);
  const [replyLyric, setReplyLyric] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const isLocked =
    note.isPasscodeProtected && note.message.startsWith("[ENCRYPTED TRANSMISSION");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    setPinError("");

    const res = await fetch(`/api/notes/${note.id}/listen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock", passcode: pinInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPinError(data.error || "Incorrect passcode.");
    } else {
      onNoteUnlocked(note.id, data.message, data.lyricExcerpt);
    }
    setUnlocking(false);
  };

  const searchReplySong = async (q: string) => {
    setReplySongQuery(q);
    if (!q.trim()) {
      setReplySongResults([]);
      return;
    }
    const res = await fetch(`/api/spotify?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setReplySongResults(data.tracks || []);
  };

  const canSubmitReply =
    replyMode === "SONG"
      ? Boolean(selectedReplyTrack)
      : replyMode === "TEXT"
      ? Boolean(replyLyric.trim())
      : Boolean(selectedReplyTrack && replyLyric.trim());

  const submitReply = async () => {
    if (!canSubmitReply) return;
    setSubmittingReply(true);
    const includeTrack = replyMode !== "TEXT" ? selectedReplyTrack : null;
    const includeText = replyMode !== "SONG" ? replyLyric.trim() : "";

    const res = await fetch(`/api/notes/${note.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        track: includeTrack,
        lyricExcerpt: includeText || null,
        senderHandle: currentUser?.username || null,
        userId: currentUser?.id || null,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      onReplyAdded(note.id, saved);
      setSelectedReplyTrack(null);
      setReplyLyric("");
      setReplySongQuery("");
      setShowReplyBox(false);
    }
    setSubmittingReply(false);
  };

  const handleCopyShareLink = async () => {
    const url = `${window.location.origin}/?note=${note.id}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy share link:", err);
    }
  };

  const fg = getContrastText(note.moodColor);
  const lyricLines =
    !isLocked && note.lyricExcerpt
      ? note.lyricExcerpt
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
      : [];

  const remainingListens =
    note.maxListens !== null && note.maxListens !== undefined
      ? Math.max(0, note.maxListens - (note.listenCount ?? 0))
      : null;

  const isThisTrackActive = playingTrackId === note.trackId;
  const activePct = isThisTrackActive ? progress : 0;
  const clipStart = note.clipStart ?? 0;
  const clipEnd = note.clipEnd ?? 30;
  const clipDuration = Math.max(1, clipEnd - clipStart);
  const elapsedSec = isThisTrackActive
    ? Math.min(clipDuration, Math.max(0, currentTime - clipStart))
    : 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: note.moodColor, color: fg }}
        className="h-dvh w-full max-w-none overflow-y-auto border-0 sm:h-auto sm:max-h-[92vh] sm:max-w-xl sm:border-2 sm:border-[#111111] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 sm:p-8 sm:shadow-[8px_8px_0px_#111111]"
      >
        {/* Top Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-current/25 pb-4">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
              ARCHIVE RECORD // NO.{String(note.id).padStart(3, "0")}
            </span>
            <h2 className="mt-1 break-words text-2xl sm:text-3xl font-bold tracking-tight">
              To: {note.recipient}
            </h2>
            {note.user && (
              <p className="mt-1 font-mono text-[10px] uppercase opacity-75">
                POSTED BY @{note.user.username}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={handleCopyShareLink}
              title="Copy Permalink"
              className="flex items-center gap-1 border border-current px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition hover:bg-current/10"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? "Copied" : "Share"}</span>
            </button>
            {!isLocked && (
              <button
                onClick={() => downloadSwissPoster(note)}
                title="Download 9:16 Print Poster"
                className="flex items-center gap-1 border border-current px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition hover:bg-current/10"
              >
                <Download className="h-3.5 w-3.5" /> 9:16
              </button>
            )}
            <button
              onClick={onClose}
              className="border border-current p-1.5 transition hover:bg-current/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Burn-after-N-listens Banner */}
        {remainingListens !== null && (
          <div className="mb-5 flex items-center justify-between border border-current bg-current/10 px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5" /> EPHEMERAL ARCHIVE NOTE
            </span>
            <span>
              {remainingListens} {remainingListens === 1 ? "LISTEN" : "LISTENS"} LEFT
            </span>
          </div>
        )}

        {/* Passcode Gate OR Full Note Body */}
        {isLocked ? (
          <div className="my-6 border-2 border-current bg-current/5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 sm:p-6">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest">
              <KeyRound className="h-4 w-4" /> ENCRYPTED TRANSMISSION
            </div>
            {note.passcodeHint && (
              <p className="mt-2 font-mono text-xs opacity-80">
                HINT: “{note.passcodeHint}”
              </p>
            )}
            <form onSubmit={handleUnlock} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                required
                placeholder="Enter passcode..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="flex-1 border border-current bg-white px-3 py-2 font-mono text-base sm:text-xs text-[#111111] outline-none"
              />
              <button
                type="submit"
                disabled={unlocking}
                className="border border-[#111111] bg-[#111111] px-4 py-2.5 sm:py-2 font-mono text-xs font-bold uppercase tracking-widest text-white"
              >
                {unlocking ? "..." : "UNLOCK"}
              </button>
            </form>
            {pinError && (
              <p className="mt-2 font-mono text-xs font-bold underline">{pinError}</p>
            )}
          </div>
        ) : (
          <>
            <p className="mb-6 whitespace-pre-wrap text-lg sm:text-xl leading-relaxed font-medium">
              “{note.message}”
            </p>

            {/* Static Editorial Pinned Lyric Excerpt Block */}
            {lyricLines.length > 0 && (
              <div className="mb-6 border-l-2 border-current pl-4 py-1">
                <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] opacity-70">
                  PINNED LYRIC EXCERPT
                </p>
                <div className="space-y-1.5 font-mono text-xs leading-relaxed">
                  {lyricLines.map((line, idx) => (
                    <p key={idx} className="font-medium opacity-95">
                      ♪ “{line}”
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Adaptive High-Contrast Swiss Tape Waveform Deck */}
        <div className="border border-current/35 bg-current/5 p-3.5 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={note.albumArt}
              alt={note.trackName}
              className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 border border-current/30 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{note.trackName}</p>
              <p className="truncate text-xs opacity-80">{note.artistName}</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase opacity-70">
                WINDOW: {clipStart}S — {clipEnd}S
              </p>
            </div>

            {note.previewUrl ? (
              <button
                onClick={() =>
                  onPlayPreview(note.previewUrl, note.trackId, clipStart, clipEnd)
                }
                style={{ backgroundColor: fg, color: note.moodColor }}
                className="flex shrink-0 items-center gap-1.5 border border-current px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition hover:opacity-85"
              >
                {isPlaying && isThisTrackActive ? (
                  <>
                    <Pause className="h-3.5 w-3.5 fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" /> Play
                  </>
                )}
              </button>
            ) : (
              <span className="border border-current/35 px-2.5 py-1.5 font-mono text-[10px] uppercase opacity-70">
                No Audio
              </span>
            )}
          </div>

          {note.previewUrl && (
            <div className="mt-4">
              {/* Interactive 40-Bar Swiss Waveform Scrubber */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = ((e.clientX - rect.left) / rect.width) * 100;
                  onSeekAudio(Math.max(0, Math.min(100, pct)));
                }}
                title="Click anywhere along the tape waveform to seek"
                className="flex h-7 w-full cursor-pointer items-end gap-[3px] py-0.5"
              >
                {WAVEFORM_BARS.map((heightPct, i) => {
                  const barThreshold = ((i + 1) / WAVEFORM_BARS.length) * 100;
                  const isFilled = activePct >= barThreshold - 1.25;
                  return (
                    <div
                      key={i}
                      style={{ height: `${heightPct}%` }}
                      className={`flex-1 bg-current transition-opacity duration-100 ${
                        isFilled ? "opacity-100" : "opacity-25 hover:opacity-50"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Timecode Readout */}
              <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-widest opacity-75">
                <span>{isPlaying && isThisTrackActive ? "● PLAYING" : "READY"}</span>
                <span>
                  {formatSec(elapsedSec)} / {formatSec(clipDuration)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Anonymous Signals */}
        <div className="mt-5 border-t border-current/25 pt-4">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
            SEND ANONYMOUS SIGNAL
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SIGNAL_TYPES.map((sig, idx) => {
              const sigKey = sig.key;
              const count = (note.reactions || []).filter((r) => r.type === sigKey).length;
              const isSent = Boolean(sentSignals[`${note.id}-${sigKey}`]);
              return (
                <button
                  key={sigKey}
                  onClick={() => onSendSignal(note.id, sigKey)}
                  style={isSent ? { backgroundColor: fg, color: note.moodColor } : undefined}
                  className={`flex items-center justify-between border border-current px-2.5 py-2 font-mono text-[10px] font-bold uppercase transition ${
                    isSent ? "" : "hover:bg-current/10"
                  }`}
                >
                  <span className="truncate">{sig.label}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Replies & Comments Thread */}
        <div className="mt-5 border-t border-current/25 pt-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-75">
              REPLIES ({note.replies?.length || 0})
            </p>
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="flex items-center gap-1 border border-current px-2.5 py-1 font-mono text-[10px] font-bold uppercase hover:bg-current/10"
            >
              <MessageSquare className="h-3 w-3" /> {showReplyBox ? "Cancel" : "Add Reply"}
            </button>
          </div>

          {showReplyBox && (
            <div className="mt-3 space-y-3 border border-[#111111] bg-white p-3.5 text-[#111111]">
              {/* 3-Way Mode Selector */}
              <div className="grid grid-cols-3 border border-[#111111] font-mono text-[10px] font-bold uppercase">
                {(
                  [
                    { id: "BOTH", label: "SONG + TEXT" },
                    { id: "SONG", label: "SONG ONLY" },
                    { id: "TEXT", label: "TEXT ONLY" },
                  ] as const
                ).map((mode, idx) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setReplyMode(mode.id)}
                    className={`py-1.5 tracking-wider transition ${
                      idx > 0 ? "border-l border-[#111111]" : ""
                    } ${
                      replyMode === mode.id
                        ? "bg-[#111111] text-white"
                        : "bg-white text-[#111111] hover:bg-[#F4F4F0]"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Song Picker (shown for BOTH and SONG) */}
              {replyMode !== "TEXT" && (
                <div>
                  {!selectedReplyTrack ? (
                    <div>
                      <input
                        type="text"
                        placeholder="Search song to attach..."
                        value={replySongQuery}
                        onChange={(e) => searchReplySong(e.target.value)}
                        className="w-full border border-[#111111] px-3 py-2 text-base sm:text-xs outline-none"
                      />
                      {replySongResults.length > 0 && (
                        <div className="mt-1.5 max-h-36 overflow-y-auto border border-[#111111] divide-y divide-neutral-200">
                          {replySongResults.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedReplyTrack(t);
                                setReplySongResults([]);
                              }}
                              className="flex w-full items-center gap-2 p-2 text-left hover:bg-[#F4F4F0]"
                            >
                              <img src={t.albumArt} alt="" className="h-7 w-7 object-cover" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold">{t.name}</p>
                                <p className="truncate text-[10px] text-neutral-500">{t.artist}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border border-[#111111] bg-[#F4F4F0] p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={selectedReplyTrack.albumArt} alt="" className="h-8 w-8 object-cover" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">{selectedReplyTrack.name}</p>
                          <p className="truncate text-[10px] text-neutral-600">
                            {selectedReplyTrack.artist}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedReplyTrack(null)}
                        className="text-[10px] font-bold uppercase underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Text Input (shown for BOTH and TEXT) */}
              {replyMode !== "SONG" && (
                <textarea
                  rows={2}
                  maxLength={240}
                  placeholder={
                    replyMode === "TEXT"
                      ? "Write your reply or comment..."
                      : "Add a note or lyric alongside this track..."
                  }
                  value={replyLyric}
                  onChange={(e) => setReplyLyric(e.target.value)}
                  className="w-full resize-none border border-[#111111] px-3 py-2 text-base sm:text-xs outline-none"
                />
              )}

              <button
                type="button"
                disabled={submittingReply || !canSubmitReply}
                onClick={submitReply}
                className="flex w-full items-center justify-center gap-1.5 bg-[#111111] py-2 font-mono text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#E11D2A] disabled:opacity-40"
              >
                <Send className="h-3 w-3" />{" "}
                {submittingReply
                  ? "TRANSMITTING..."
                  : replyMode === "TEXT"
                  ? "POST TEXT REPLY"
                  : replyMode === "SONG"
                  ? "TRANSMIT SONG REPLY"
                  : "TRANSMIT SONG + TEXT"}
              </button>
            </div>
          )}

          {note.replies && note.replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {note.replies.map((rep: any) => {
                const hasSong = Boolean(rep.trackName);
                const commentText = rep.lyricExcerpt || rep.lyricLine;
                const handle = rep.senderHandle || rep.user?.username;

                return (
                  <div
                    key={rep.id}
                    className="flex items-start justify-between gap-2.5 border border-current/30 bg-current/5 p-2.5"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {hasSong ? (
                        <img
                          src={rep.albumArt}
                          alt=""
                          className="h-9 w-9 shrink-0 border border-current/25 object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-current/25 font-mono text-[10px] font-bold">
                          TXT
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {hasSong && (
                          <p className="truncate text-xs font-bold">
                            {rep.trackName}{" "}
                            <span className="font-normal opacity-75">— {rep.artistName}</span>
                          </p>
                        )}
                        {commentText && (
                          <p
                            className={`break-words ${
                              hasSong
                                ? "mt-0.5 font-mono text-[11px] opacity-90"
                                : "text-xs leading-snug"
                            }`}
                          >
                            {hasSong ? `“${commentText}”` : commentText}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-[9px] uppercase opacity-65">
                          {handle ? `@${handle}` : "ANONYMOUS LISTENER"}
                        </p>
                      </div>
                    </div>
                  {rep.previewUrl && (
                    <button
                      onClick={() => onPlayPreview(rep.previewUrl, rep.trackId, 0, 30)}
                      className="shrink-0 border border-current p-1.5 hover:bg-current/10"
                    >
                      {isPlaying && playingTrackId === rep.trackId ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
