"use client";

import { Play, Pause, X, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { SIGNAL_TYPES, StoryUser } from "../types/archive";
import { formatIndex, getContrastText, getMonogram } from "../utils/poster";

interface StoryViewerModalProps {
  storyUser: StoryUser;
  storyIndex: number;
  storyProgress: number;
  isStoryPaused: boolean;
  setIsStoryPaused: (v: boolean) => void;
  currentTime: number;
  isPlaying: boolean;
  sentSignals: Record<string, boolean>;
  onSendSignal: (noteId: number, type: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
  onPlayPreview: (
    url: string | null | undefined,
    trackId: string,
    start: number,
    end: number,
    forceRestart?: boolean
  ) => void;
}

export default function StoryViewerModal({
  storyUser,
  storyIndex,
  storyProgress,
  isStoryPaused,
  setIsStoryPaused,
  isPlaying,
  sentSignals,
  onSendSignal,
  onPrev,
  onNext,
  onClose,
  onOpenProfile,
  onPlayPreview,
}: StoryViewerModalProps) {
  const sNote = storyUser.notes[storyIndex];
  if (!sNote) return null;

  const fg = getContrastText(sNote.moodColor);
  const isLight = fg === "#111111";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/90 p-0 sm:p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: sNote.moodColor, color: fg }}
        className="relative flex h-dvh w-full max-w-none flex-col justify-between overflow-y-auto border-0 sm:h-[86vh] sm:max-h-[760px] sm:max-w-md sm:border-2 sm:border-white/30 p-6 sm:shadow-2xl select-none"
      >
        <div>
          <div className="mb-4 flex gap-1.5">
            {storyUser.notes.map((n, idx) => {
              const fillPct =
                idx < storyIndex ? 100 : idx === storyIndex ? storyProgress : 0;
              return (
                <div
                  key={n.id}
                  className="h-1 flex-1 overflow-hidden bg-current/25"
                >
                  <div
                    style={{ width: `${fillPct}%` }}
                    className="h-full bg-current transition-all duration-100"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                onClose();
                onOpenProfile(storyUser.username);
              }}
              className="flex items-center gap-2.5 text-left"
            >
              <span
                style={{
                  backgroundColor: storyUser.monogramColor,
                  color: getContrastText(storyUser.monogramColor),
                }}
                className="flex h-8 w-8 items-center justify-center border border-current font-mono text-xs font-bold"
              >
                {getMonogram(storyUser.username)}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  @{storyUser.username}
                </p>
                <p className="font-mono text-[10px] opacity-75">
                  NO.{formatIndex(sNote.id)} • {storyUser.archetype}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsStoryPaused(!isStoryPaused)}
                className="border border-current/40 p-1.5 hover:bg-black/20"
                title={isStoryPaused ? "Resume" : "Pause"}
              >
                {isStoryPaused ? (
                  <Play className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Pause className="h-3.5 w-3.5 fill-current" />
                )}
              </button>
              <button
                onClick={onClose}
                className="border border-current/40 p-1.5 hover:bg-black/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tap Zones */}
        <div
          onClick={onPrev}
          className="absolute inset-y-24 left-0 w-1/4 cursor-pointer z-10"
          title="Previous"
        />
        <div
          onClick={onNext}
          className="absolute inset-y-24 right-0 w-1/4 cursor-pointer z-10"
          title="Next"
        />

        <div className="relative z-20 my-auto py-4">
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.18em] opacity-80">
            TO: {sNote.recipient}
          </p>
          <p className="whitespace-pre-wrap text-xl font-medium leading-relaxed">
            “{sNote.message}”
          </p>

          {sNote.lyricExcerpt && (
            <div className="mt-5 border-l-2 border-current pl-3">
              <p className="whitespace-pre-line font-mono text-xs italic opacity-90">
                ♪ “{sNote.lyricExcerpt}”
              </p>
            </div>
          )}
        </div>

        <div className="relative z-20 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SIGNAL_TYPES.map((sig) => {
              const isSent = sentSignals[`${sNote.id}-${sig.key}`];
              const count =
                sNote.reactions?.filter((r) => r.type === sig.key).length || 0;
              return (
                <button
                  key={sig.key}
                  onClick={() => onSendSignal(sNote.id, sig.key)}
                  className={`border px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition ${
                    isSent
                      ? isLight
                        ? "border-[#111111] bg-[#111111] text-white"
                        : "border-white bg-white text-[#111111]"
                      : "border-current/40 hover:bg-black/20"
                  }`}
                >
                  {sig.label} [{count}]
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 border border-[#111111] bg-[#F4F4F0] p-3 text-[#111111]">
            <div className="flex items-center gap-2.5 min-w-0">
              {sNote.albumArt && (
                <img
                  src={sNote.albumArt}
                  alt=""
                  className="h-10 w-10 border border-[#111111] object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase text-[#E11D2A]">
                  <Volume2 className="h-3 w-3" /> {sNote.clipStart}S–{sNote.clipEnd}S
                </p>
                <p className="truncate text-xs font-bold">{sNote.trackName}</p>
                <p className="truncate text-[10px] text-neutral-600">{sNote.artistName}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onPrev}
                className="border border-[#111111] bg-white p-1.5 hover:bg-[#111111] hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {sNote.previewUrl && (
                <button
                  onClick={() =>
                    onPlayPreview(
                      sNote.previewUrl,
                      sNote.trackId,
                      sNote.clipStart,
                      sNote.clipEnd,
                      false
                    )
                  }
                  className="border border-[#111111] bg-[#111111] p-1.5 text-white hover:bg-[#E11D2A]"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                </button>
              )}
              <button
                onClick={onNext}
                className="border border-[#111111] bg-white p-1.5 hover:bg-[#111111] hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
