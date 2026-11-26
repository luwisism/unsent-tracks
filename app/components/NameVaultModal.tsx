"use client";

import { useState } from "react";
import { X, Receipt, ArrowRight } from "lucide-react";
import { Note } from "../types/archive";
import { formatIndex } from "../utils/poster";

interface NameVaultModalProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onClose: () => void;
}

export default function NameVaultModal({
  notes,
  onSelectNote,
  onClose,
}: NameVaultModalProps) {
  const [queryName, setQueryName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const matches = queryName.trim()
    ? notes.filter((n) =>
        n.recipient.toLowerCase().includes(queryName.trim().toLowerCase())
      )
    : [];

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryName.trim()) return;
    setHasSearched(true);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-dvh w-full max-w-none overflow-y-auto border-0 bg-[#F4F4F0] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:border-2 sm:border-[#111111] sm:p-7 text-[#111111] sm:shadow-[8px_8px_0px_#E11D2A]"
      >
        <div className="mb-5 flex items-center justify-between border-b border-dashed border-[#111111] pb-4">
          <div>
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11D2A]">
              <Receipt className="h-3.5 w-3.5" /> FREQUENCY LOOKUP SLIP
            </span>
            <h2 className="mt-1 text-xl font-bold uppercase">Search Your Name</h2>
          </div>
          <button
            onClick={onClose}
            className="border border-[#111111] bg-white p-1.5 hover:bg-[#111111] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-neutral-700">
          Enter your first name, nickname, or initials to check if someone left an unsent note
          addressed to you in the archive.
        </p>

        <form onSubmit={handleCheck} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="e.g. Rhu, K., or A."
            value={queryName}
            onChange={(e) => {
              setQueryName(e.target.value);
              setHasSearched(false);
            }}
            className="flex-1 border border-[#111111] bg-white px-3.5 py-2.5 font-mono text-sm outline-none"
          />
          <button
            type="submit"
            className="border border-[#111111] bg-[#111111] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#E11D2A]"
          >
            Scan
          </button>
        </form>

        {hasSearched && (
          <div className="mt-6 border-2 border-dashed border-[#111111] bg-white pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 font-mono">
            <div className="mb-3 flex justify-between border-b border-neutral-300 pb-2 text-[10px] uppercase text-neutral-500">
              <span>QUERY: “{queryName.toUpperCase()}”</span>
              <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>

            <p className="text-sm font-bold uppercase">
              {matches.length === 0
                ? "00 TRANSMISSIONS FOUND"
                : `${String(matches.length).padStart(2, "0")} TRANSMISSION(S) FOUND`}
            </p>

            {matches.length === 0 ? (
              <p className="mt-2 text-xs text-neutral-600">
                No public entries match this exact name yet—or the sender used different initials.
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onClose();
                      onSelectNote(m);
                    }}
                    className="flex w-full items-center justify-between border border-[#111111] bg-[#F4F4F0] p-3 text-left transition hover:bg-[#111111] hover:text-white"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-[10px] font-bold uppercase text-[#E11D2A]">
                        NO.{formatIndex(m.id)} • TO: {m.recipient}
                      </p>
                      <p className="truncate text-xs font-sans font-medium mt-0.5">
                        {m.trackName} — {m.artistName}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
