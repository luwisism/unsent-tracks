"use client";

import { useState, useEffect } from "react";
import { X, Play, Plus, CassetteTape, Check } from "lucide-react";
import { Mixtape, Note, SWISS_SWATCHES, UserProfile } from "../types/archive";
import { formatIndex, getContrastText } from "../utils/poster";

interface MixtapeDrawerModalProps {
  notes: Note[];
  currentUser: UserProfile | null;
  onPlayMixtape: (mixtape: Mixtape) => void;
  onClose: () => void;
}

export default function MixtapeDrawerModal({
  notes,
  currentUser,
  onPlayMixtape,
  onClose,
}: MixtapeDrawerModalProps) {
  const [mixtapes, setMixtapes] = useState<Mixtape[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverColor, setCoverColor] = useState("#111111");
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const loadMixtapes = () => {
    fetch("/api/mixtapes")
      .then((r) => r.json())
      .then((d) => setMixtapes(d.mixtapes || []));
  };

  useEffect(() => {
    loadMixtapes();
  }, []);

  const toggleNoteSelection = (id: number) => {
    setSelectedNoteIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  };

  const handleCreateMixtape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedNoteIds.length === 0) return;
    setSaving(true);
    const res = await fetch("/api/mixtapes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subtitle,
        coverColor,
        creatorName: currentUser ? `@${currentUser.username}` : "ANONYMOUS",
        userId: currentUser?.id || null,
        noteIds: selectedNoteIds,
      }),
    });
    if (res.ok) {
      setTitle("");
      setSubtitle("");
      setSelectedNoteIds([]);
      setIsCreating(false);
      loadMixtapes();
    }
    setSaving(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-dvh w-full max-w-none overflow-y-auto border-0 bg-[#F4F4F0] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:border-2 sm:border-[#111111] sm:p-7 text-[#111111] sm:shadow-[8px_8px_0px_#111111]"
      >
        <div className="mb-5 flex items-center justify-between border-b border-[#111111] pb-4">
          <div>
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11D2A]">
              <CassetteTape className="h-3.5 w-3.5" /> CURATED CASSETTE ARCHIVE
            </span>
            <h2 className="mt-1 text-xl font-bold uppercase">Swiss Mixtapes</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1 border border-[#111111] bg-[#111111] px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-[#E11D2A]"
            >
              <Plus className="h-3.5 w-3.5" /> {isCreating ? "View Tapes" : "Assemble Tape"}
            </button>
            <button
              onClick={onClose}
              className="border border-[#111111] bg-white p-1.5 hover:bg-[#111111] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isCreating ? (
          <form onSubmit={handleCreateMixtape} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest">
                  Cassette Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Side A: 2 AM Rain"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-[#111111] bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest">
                  Liner Subtitle
                </label>
                <input
                  type="text"
                  placeholder="For things left unsaid..."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full border border-[#111111] bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest">
                Cassette Shell Color
              </label>
              <div className="flex gap-2">
                {SWISS_SWATCHES.map((s) => (
                  <button
                    key={s.hex}
                    type="button"
                    onClick={() => setCoverColor(s.hex)}
                    style={{ backgroundColor: s.hex, color: s.text }}
                    className={`flex h-7 w-10 items-center justify-center border border-[#111111] ${
                      coverColor === s.hex ? "ring-2 ring-[#E11D2A]" : ""
                    }`}
                  >
                    {coverColor === s.hex && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest">
                Select 1–6 Archive Entries ({selectedNoteIds.length}/6)
              </label>
              <div className="max-h-56 overflow-y-auto border border-[#111111] bg-white divide-y divide-neutral-200">
                {notes
                  .filter((n) => n.previewUrl)
                  .map((n) => {
                    const checked = selectedNoteIds.includes(n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => toggleNoteSelection(n.id)}
                        className={`flex w-full items-center justify-between p-2.5 text-left text-xs transition ${
                          checked ? "bg-[#111111] text-white" : "hover:bg-[#F4F4F0]"
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <p className="font-mono text-[10px] uppercase opacity-75">
                            NO.{formatIndex(n.id)} • TO: {n.recipient}
                          </p>
                          <p className="truncate font-bold">{n.trackName} — {n.artistName}</p>
                        </div>
                        <span className="font-mono text-[10px] font-bold">
                          {checked ? "✓ ADDED" : "+ ADD"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || selectedNoteIds.length === 0}
              className="w-full border border-[#111111] bg-[#E11D2A] py-3 text-xs font-bold uppercase tracking-[0.2em] text-white disabled:opacity-40"
            >
              {saving ? "RECORDING CASSETTE..." : "SAVE MIXTAPE TO ARCHIVE"}
            </button>
          </form>
        ) : mixtapes.length === 0 ? (
          <div className="border border-dashed border-[#111111] p-10 text-center">
            <p className="font-mono text-xs uppercase text-neutral-600">
              NO CASSETTES ASSEMBLED YET. CLICK “ASSEMBLE TAPE” TO BUNDLE NOTES INTO A PLAYLIST.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mixtapes.map((tape) => {
              const fg = getContrastText(tape.coverColor);
              return (
                <div
                  key={tape.id}
                  style={{ backgroundColor: tape.coverColor, color: fg }}
                  className="border-2 border-[#111111] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] px-5"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-current/25 pb-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest opacity-75">
                        CASSETTE NO.{formatIndex(tape.id)} • CURATED BY {tape.creatorName}
                      </p>
                      <h3 className="text-xl font-bold uppercase">{tape.title}</h3>
                      {tape.subtitle && <p className="text-xs opacity-80">{tape.subtitle}</p>}
                    </div>
                    <button
                      onClick={() => {
                        onPlayMixtape(tape);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 border border-current px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-black/20"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Play Tape ({tape.items.length})
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5 font-mono text-xs">
                    {tape.items.map((item, idx) => (
                      <div key={item.id} className="flex justify-between opacity-90">
                        <span className="truncate pr-2">
                          0{idx + 1}. {item.note.trackName} — {item.note.artistName}
                        </span>
                        <span className="shrink-0 opacity-70">TO: {item.note.recipient}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
