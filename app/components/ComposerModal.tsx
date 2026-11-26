"use client";

import { useState, useEffect } from "react";
import { X, Check, Scissors, Quote, Lock, KeyRound, Flame } from "lucide-react";
import { SWISS_SWATCHES, Track, UserProfile } from "../types/archive";
import { getContrastText } from "../utils/poster";

interface ComposerModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onSuccess: () => void;
  onOpenAuth: () => void;
  onPlayPreview: (
    url: string | null | undefined,
    trackId: string,
    start: number,
    end: number,
    forceRestart?: boolean
  ) => void;
  onStopAudio: () => void;
}

export default function ComposerModal({
  currentUser,
  onClose,
  onSuccess,
  onOpenAuth,
  onPlayPreview,
  onStopAudio,
}: ComposerModalProps) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [moodColor, setMoodColor] = useState(SWISS_SWATCHES[1].hex);
  const [postUnlisted, setPostUnlisted] = useState(false);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(30);
  const [availableLyrics, setAvailableLyrics] = useState<string[]>([]);
  const [selectedLyricLines, setSelectedLyricLines] = useState<string[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [unlockAt, setUnlockAt] = useState("");
  const [passcode, setPasscode] = useState("");
  const [passcodeHint, setPasscodeHint] = useState("");
  const [maxListens, setMaxListens] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!songQuery.trim()) {
      setSongResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/spotify?q=${encodeURIComponent(songQuery)}`);
      const data = await res.json();
      setSongResults(data.tracks || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [songQuery]);

  useEffect(() => {
    if (!selectedTrack) {
      setAvailableLyrics([]);
      setSelectedLyricLines([]);
      return;
    }
    setIsLoadingLyrics(true);
    fetch(
      `/api/lyrics?track=${encodeURIComponent(selectedTrack.name)}&artist=${encodeURIComponent(
        selectedTrack.artist
      )}`
    )
      .then((r) => r.json())
      .then((d) => setAvailableLyrics(d.lines || []))
      .catch(() => setAvailableLyrics([]))
      .finally(() => setIsLoadingLyrics(false));
  }, [selectedTrack]);

  const toggleLyricLine = (line: string) => {
    setSelectedLyricLines((prev) => {
      if (prev.includes(line)) return prev.filter((l) => l !== line);
      if (prev.length >= 4) return prev;
      return [...prev, line];
    });
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !message || !selectedTrack) return;

    setIsSubmitting(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient,
        message,
        moodColor,
        track: selectedTrack,
        userId: currentUser && !postUnlisted ? currentUser.id : null,
        lyricExcerpt: selectedLyricLines.length > 0 ? selectedLyricLines.join("\n") : null,
        clipStart,
        clipEnd,
        unlockAt: unlockAt ? new Date(unlockAt).toISOString() : null,
        passcode: passcode || null,
        passcodeHint: passcodeHint || null,
        maxListens: maxListens ? Number(maxListens) : null,
      }),
    });

    if (res.ok) {
      onSuccess();
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto border-2 border-[#111111] bg-[#F4F4F0] p-7 text-[#111111] shadow-[8px_8px_0px_#111111]"
      >
        <div className="mb-5 flex items-center justify-between border-b border-[#111111] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11D2A]">
              ARCHIVE SUBMISSION
            </span>
            <h2 className="text-xl font-bold uppercase">Compose Unsent Note</h2>
          </div>
          <button
            onClick={onClose}
            className="border border-[#111111] bg-white p-1.5 hover:bg-[#111111] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleNoteSubmit} className="space-y-4">
          <div className="flex items-center justify-between border border-[#111111] bg-white p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                POSTING AS
              </p>
              <p className="text-xs font-bold uppercase">
                {currentUser && !postUnlisted
                  ? `@${currentUser.username} (24H STORY + PROFILE)`
                  : "UNLISTED SENDER"}
              </p>
            </div>
            {currentUser ? (
              <button
                type="button"
                onClick={() => setPostUnlisted(!postUnlisted)}
                className="border border-[#111111] px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-[#111111] hover:text-white"
              >
                {postUnlisted ? "Show Name" : "Post Unlisted"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="text-[10px] font-bold uppercase underline text-[#E11D2A]"
              >
                Claim Handle →
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.15em]">
              01 / Recipient
            </label>
            <input
              type="text"
              required
              placeholder="Name, nickname, or initials..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full border border-[#111111] bg-white px-3.5 py-2 text-sm font-medium outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.15em]">
              02 / Unsent Message
            </label>
            <textarea
              required
              rows={3}
              placeholder="Write what stayed unsaid..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-[#111111] bg-white px-3.5 py-2 text-sm font-medium outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.15em]">
              03 / Search Song, Trim Clip &amp; Pick Lyrics
            </label>
            {selectedTrack ? (
              <div className="space-y-3 border border-[#111111] bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedTrack.albumArt}
                      alt=""
                      className="h-10 w-10 border border-[#111111] object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{selectedTrack.name}</p>
                      <p className="truncate text-[11px] text-neutral-600">
                        {selectedTrack.artist}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTrack(null);
                      setSongQuery("");
                      onStopAudio();
                    }}
                    className="border border-[#111111] px-2 py-1 text-[10px] font-bold uppercase"
                  >
                    Change
                  </button>
                </div>

                {selectedTrack.previewUrl && (
                  <div className="border-t border-neutral-200 pt-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase">
                        <Scissors className="h-3 w-3 text-[#E11D2A]" /> TRIM PREVIEW:{" "}
                        {clipStart}S → {clipEnd}S
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onPlayPreview(
                            selectedTrack.previewUrl,
                            selectedTrack.id,
                            clipStart,
                            clipEnd,
                            true
                          )
                        }
                        className="bg-[#111111] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white hover:bg-[#E11D2A]"
                      >
                        Test Clip
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="font-mono text-[9px] text-neutral-500">
                          START ({clipStart}s)
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={25}
                          value={clipStart}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setClipStart(val);
                            if (clipEnd <= val + 3) setClipEnd(Math.min(30, val + 5));
                          }}
                          className="w-full accent-[#111111]"
                        />
                      </div>
                      <div>
                        <span className="font-mono text-[9px] text-neutral-500">
                          END ({clipEnd}s)
                        </span>
                        <input
                          type="range"
                          min={5}
                          max={30}
                          value={clipEnd}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setClipEnd(Math.max(clipStart + 3, val));
                          }}
                          className="w-full accent-[#E11D2A]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-neutral-200 pt-2.5">
                  <p className="mb-1.5 flex items-center gap-1 font-mono text-[10px] font-bold uppercase">
                    <Quote className="h-3 w-3 text-[#E11D2A]" /> PIN LYRIC EXCERPT (MAX 4 LINES)
                  </p>
                  {isLoadingLyrics ? (
                    <p className="font-mono text-[10px] text-neutral-400">
                      Fetching lyrics from LRCLIB...
                    </p>
                  ) : availableLyrics.length === 0 ? (
                    <p className="font-mono text-[10px] text-neutral-400">
                      No indexed lyrics found for this track.
                    </p>
                  ) : (
                    <div className="max-h-28 overflow-y-auto border border-neutral-300 bg-[#F4F4F0] p-1.5 space-y-1">
                      {availableLyrics.map((line, idx) => {
                        const active = selectedLyricLines.includes(line);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleLyricLine(line)}
                            className={`block w-full px-2 py-1 text-left font-mono text-[11px] transition ${
                              active
                                ? "bg-[#111111] text-white font-bold"
                                : "hover:bg-white text-neutral-800"
                            }`}
                          >
                            {active ? "✓ " : ""}
                            {line}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Type song title or artist..."
                  value={songQuery}
                  onChange={(e) => setSongQuery(e.target.value)}
                  className="w-full border border-[#111111] bg-white px-3.5 py-2 text-sm outline-none"
                />
                {songResults.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-[#111111] bg-white divide-y divide-neutral-200">
                    {songResults.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTrack(t);
                          setSongResults([]);
                        }}
                        className="flex w-full items-center gap-2.5 p-2 text-left hover:bg-[#F4F4F0]"
                      >
                        <img src={t.albumArt} alt="" className="h-8 w-8 object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">{t.name}</p>
                          <p className="truncate text-[10px] text-neutral-500">{t.artist}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border border-[#111111] bg-white p-3">
            <div>
              <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <KeyRound className="h-3 w-3 text-[#E11D2A]" /> Passcode Lock (Optional)
              </label>
              <input
                type="text"
                placeholder="4-digit PIN..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full border border-[#111111] px-2.5 py-1.5 font-mono text-xs outline-none"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Flame className="h-3 w-3 text-[#E11D2A]" /> Burn After Listens
              </label>
              <select
                value={maxListens}
                onChange={(e) => setMaxListens(e.target.value)}
                className="w-full border border-[#111111] bg-white px-2.5 py-1.5 font-mono text-xs outline-none"
              >
                <option value="">Permanent (Default)</option>
                <option value="1">1 Full Listen (Self-Destruct)</option>
                <option value="3">3 Full Listens</option>
                <option value="5">5 Full Listens</option>
              </select>
            </div>
            {passcode && (
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Secret hint (e.g. Where we first met...)"
                  value={passcodeHint}
                  onChange={(e) => setPasscodeHint(e.target.value)}
                  className="w-full border border-[#111111] px-2.5 py-1.5 font-mono text-xs outline-none"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Lock className="h-3 w-3 text-[#E11D2A]" /> Time-Capsule Unlock Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={unlockAt}
                onChange={(e) => setUnlockAt(e.target.value)}
                className="w-full border border-[#111111] px-2.5 py-1.5 font-mono text-xs outline-none"
              />
            </div>
          </div>

          {/* Card Surface Swatches + Custom Color Picker */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em]">
                04 / Card Surface Color
              </label>
              <span
                style={{
                  backgroundColor: moodColor,
                  color: getContrastText(moodColor),
                }}
                className="border border-[#111111] px-2 py-0.5 font-mono text-[10px] font-bold"
              >
                {moodColor.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid flex-1 grid-cols-6 gap-1.5">
                {SWISS_SWATCHES.map((s) => (
                  <button
                    key={s.hex}
                    type="button"
                    onClick={() => setMoodColor(s.hex)}
                    style={{ backgroundColor: s.hex, color: s.text }}
                    className={`flex h-8 items-center justify-center border border-[#111111] ${
                      moodColor.toLowerCase() === s.hex.toLowerCase()
                        ? "ring-2 ring-[#E11D2A] ring-offset-1"
                        : ""
                    }`}
                  >
                    {moodColor.toLowerCase() === s.hex.toLowerCase() && (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                ))}
              </div>
              <label
                title="Custom hex surface color"
                className="flex h-8 cursor-pointer items-center gap-1 border border-[#111111] bg-white px-2 font-mono text-[10px] font-bold uppercase hover:bg-[#111111] hover:text-white"
              >
                <input
                  type="color"
                  value={moodColor}
                  onChange={(e) => setMoodColor(e.target.value)}
                  className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
                HEX
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedTrack}
            className="w-full border border-[#111111] bg-[#111111] py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#E11D2A] disabled:opacity-40"
          >
            {isSubmitting ? "WRITING TO SQLITE..." : "COMMIT TO ARCHIVE"}
          </button>
        </form>
      </div>
    </div>
  );
}
