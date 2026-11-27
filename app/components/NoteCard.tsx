"use client";

import MemberBadge from "./MemberBadge";

import { motion } from "motion/react";
import { Play, Pause, Lock, Flame, KeyRound } from "lucide-react";
import { CubeEyesIcon } from "./ManifestoModal";
import { TACTILE_SPRING } from "../utils/motion";
import { Note } from "../types/archive";
import { formatCountdown, formatIndex, getContrastText, getMonogram } from "../utils/poster";

interface NoteCardProps {
  note: Note;
  locked: boolean;
  isPasscodeLocked: boolean;
  nowTick: number;
  isPlaying: boolean;
  playingTrackId: string | null;
  darkMode: boolean;
  onCardClick: () => void;
  onOpenProfile: (username: string) => void;
}

export default function NoteCard({
  note,
  locked,
  isPasscodeLocked,
  nowTick,
  isPlaying,
  playingTrackId,
  darkMode,
  onCardClick,
  onOpenProfile,
}: NoteCardProps) {
  const textColor = getContrastText(note.moodColor);
  const isLightCard = textColor === "#111111";
  const totalSignals = note.reactions?.length || 0;
  const replyCount = note.replies?.length || 0;
  const gridBorder = darkMode ? "border-neutral-700" : "border-[#111111]";

  const remainingListens =
    note.maxListens && note.maxListens > 0
      ? Math.max(0, note.maxListens - (note.listenCount || 0))
      : null;

  return (
    <motion.article
      onClick={onCardClick}
      initial={{ opacity: 0, y: 24, scale: 0.975 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: "some" }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
      style={{ backgroundColor: note.moodColor, color: textColor }}
      className={`group flex cursor-pointer flex-col justify-between border-b border-r ${gridBorder} p-6 transition-opacity hover:opacity-95`}
    >
      <div>
        <div
          className={`mb-4 flex items-center justify-between border-b pb-3 text-[11px] font-bold uppercase tracking-[0.15em] ${
            isLightCard ? "border-[#111111]/20" : "border-white/25"
          }`}
        >
          <span className="truncate pr-2">TO: {note.recipient}</span>
          <span className="font-mono">NO.{formatIndex(note.id)}</span>
        </div>

        <div className="mb-4 flex items-center justify-between gap-2">
          {note.user ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              transition={TACTILE_SPRING}
              onClick={(e) => {
                e.stopPropagation();
                onOpenProfile(note.user!.username);
              }}
              className={`inline-flex items-center gap-2 border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                isLightCard
                  ? "border-[#111111] bg-[#F4F4F0] text-[#111111] hover:bg-[#111111] hover:text-white"
                  : "border-white/40 bg-black/25 text-white hover:bg-white hover:text-[#111111]"
              }`}
            >
              <span
                style={{
                  backgroundColor: note.user.monogramColor,
                  color: getContrastText(note.user.monogramColor),
                }}
                className="px-1 font-mono"
              >
                {getMonogram(note.user.username)}
              </span>
              @{note.user.username}
              <MemberBadge badge={note.user.badge} lightSurface={false} />
            </motion.button>
          ) : (
            <span
              className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest opacity-70 ${
                isLightCard ? "border-[#111111]/30" : "border-white/30"
              }`}
            >
              FROM: UNLISTED
            </span>
          )}

          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase">
            {remainingListens !== null && (
              <span
                title="Self-destructs when listens hit zero"
                className="inline-flex items-center gap-0.5 bg-[#E11D2A] px-1.5 py-0.5 text-white"
              >
                <Flame className="h-3 w-3" /> {remainingListens} LEFT
              </span>
            )}
            {locked ? (
              <span className="inline-flex items-center gap-1 border border-current px-2 py-0.5">
                <Lock className="h-3 w-3" /> SEALED
              </span>
            ) : isPasscodeLocked ? (
              <span className="inline-flex items-center gap-1 border border-current px-2 py-0.5">
                <KeyRound className="h-3 w-3" /> PIN
              </span>
            ) : (
              <span className="flex items-center gap-2 opacity-85">
                {replyCount > 0 && (
                  <span className="inline-flex items-center gap-0.5">
                    <CubeEyesIcon className="h-3 w-3" /> {replyCount}
                  </span>
                )}
                <span>♥ {totalSignals}</span>
              </span>
            )}
          </div>
        </div>

        {locked && note.unlockAt ? (
          <div
            className={`my-4 border p-4 ${
              isLightCard
                ? "border-[#111111] bg-[#F4F4F0] text-[#111111]"
                : "border-white/40 bg-black/30 text-white"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11D2A]">
              TIME-CAPSULE TRANSMISSION
            </p>
            <p className="mt-1 font-mono text-xl font-bold">
              {formatCountdown(note.unlockAt, nowTick)}
            </p>
            <p className="mt-1 text-[11px] opacity-75">
              Message sealed until scheduled release. Audio preview unlocked below.
            </p>
          </div>
        ) : isPasscodeLocked ? (
          <div
            className={`my-4 border p-4 ${
              isLightCard
                ? "border-[#111111] bg-[#F4F4F0] text-[#111111]"
                : "border-white/40 bg-black/30 text-white"
            }`}
          >
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11D2A]">
              <KeyRound className="h-3 w-3" /> FOR EYES ONLY // ENCRYPTED
            </p>
            <p className="mt-1.5 font-mono text-xs font-bold">
              HINT: {note.passcodeHint || "4-DIGIT SECRET PIN REQUIRED"}
            </p>
            <p className="mt-1 text-[11px] opacity-75">Click card to enter passcode &amp; decrypt.</p>
          </div>
        ) : (
          <>
            <p className="line-clamp-4 whitespace-pre-wrap text-lg font-medium leading-snug tracking-tight">
              “{note.message}”
            </p>
            {note.lyricExcerpt && (
              <p
                className={`mt-3 border-l-2 pl-2.5 font-mono text-[11px] italic opacity-85 line-clamp-2 ${
                  isLightCard ? "border-[#111111]" : "border-white"
                }`}
              >
                ♪ “{note.lyricExcerpt.replace(/\n/g, " / ")}”
              </p>
            )}
          </>
        )}
      </div>

      <div
        className={`mt-6 flex items-center gap-3 border p-2.5 ${
          isLightCard
            ? "border-[#111111] bg-[#F4F4F0] text-[#111111]"
            : "border-white/30 bg-black/25 text-white"
        }`}
      >
        {note.albumArt && (
          <img
            src={note.albumArt}
            alt={note.trackName}
            className="h-11 w-11 shrink-0 border border-current/20 object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-wide">{note.trackName}</p>
          <p className="truncate text-[11px] opacity-75">
            {note.artistName} • {note.clipStart}s–{note.clipEnd}s
          </p>
        </div>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center border ${
            isLightCard
              ? "border-[#111111] group-hover:bg-[#111111] group-hover:text-white"
              : "border-white/40 group-hover:bg-white group-hover:text-[#111111]"
          } transition`}
        >
          {isPlaying && playingTrackId === note.trackId ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
        </div>
      </div>
    </motion.article>
  );
}