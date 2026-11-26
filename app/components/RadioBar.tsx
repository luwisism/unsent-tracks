"use client";

import { Play, Pause, SkipForward, X } from "lucide-react";
import { Note } from "../types/archive";
import { formatIndex } from "../utils/poster";

interface RadioBarProps {
  radioNote: Note;
  isPlaying: boolean;
  progress: number;
  onPlayToggle: () => void;
  onNext: () => void;
  onClose: () => void;
}

export default function RadioBar({
  radioNote,
  isPlaying,
  progress,
  onPlayToggle,
  onNext,
  onClose,
}: RadioBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-[#111111] bg-[#111111] text-white">
      <div className="h-1 w-full bg-neutral-800">
        <div
          className="h-full bg-[#E11D2A] transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="bg-[#E11D2A] px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
            ON AIR // NO.{formatIndex(radioNote.id)}
          </span>
          <p className="truncate text-xs font-bold uppercase">
            TO: {radioNote.recipient} — “{radioNote.message}”
          </p>
          <span className="hidden md:inline font-mono text-xs text-neutral-400">
            (♪ {radioNote.trackName})
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onPlayToggle}
            className="border border-white/30 p-2 hover:bg-white hover:text-[#111111]"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-1 border border-white/30 px-3 py-1.5 text-xs font-bold uppercase hover:bg-white hover:text-[#111111]"
          >
            Next <SkipForward className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="border border-white/30 p-2 hover:bg-[#E11D2A]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
