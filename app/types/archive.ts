export interface Track {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  previewUrl: string;
}

export interface SyncedLyricLine {
  time: number;
  text: string;
}

export interface Reaction {
  id: number;
  type: string;
}

export interface SongReply {
  id: number;
  noteId: number;
  trackId: string;
  trackName: string;
  artistName: string;
  albumArt: string;
  previewUrl: string | null;
  lyricExcerpt: string | null;
  senderHandle: string | null;
  senderBadge?: string | null;
  stampCounts?: { HEART: number; PLUS_ONE: number };
  createdAt: string;
}

export interface UserProfile {
  id: number;
  username: string;
  badge?: string | null;
  passcode?: string;
  monogramColor: string;
  bio: string;
  archetype: string;
  tags?: string;
  frequency: string;
  coordinates: string;
  anthemTrackId: string | null;
  anthemTrackName: string | null;
  anthemArtist: string | null;
  anthemAlbumArt: string | null;
  anthemPreview: string | null;
  pinnedNoteId?: number | null;
  notes?: Note[];
}

export interface Note {
  id: number;
  recipient: string;
  message: string;
  moodColor: string;
  trackId: string;
  trackName: string;
  artistName: string;
  albumArt: string;
  previewUrl: string | null;
  lyricExcerpt?: string | null;
  syncedLyrics?: string | null;
  clipStart: number;
  clipEnd: number;
  unlockAt?: string | null;
  isPasscodeProtected?: boolean;
  passcodeHint?: string | null;
  maxListens?: number | null;
  listenCount?: number;
  isFeatured?: boolean;
  createdAt: string;
  reactions?: Reaction[];
  replies?: SongReply[];
  user?: {
    id: number;
    username: string;
    badge?: string | null;
    monogramColor: string;
    archetype: string;
    tags?: string;
  } | null;
}

export interface StoryUser {
  id: number;
  username: string;
  badge?: string | null;
  monogramColor: string;
  archetype: string;
  tags?: string;
  notes: Note[];
}

export interface MixtapeItem {
  id: number;
  order: number;
  note: Note;
}

export interface Mixtape {
  id: number;
  title: string;
  subtitle: string;
  coverColor: string;
  creatorName: string;
  items: MixtapeItem[];
}

export const SIDEB_BADGE_PRESETS = [
  "RESIDENT",
  "ARCHIVIST",
  "1ST PRESS",
  "SELECTOR",
] as const;

export const SWISS_SWATCHES = [
  { name: "Ink", hex: "#111111", text: "#FFFFFF" },
  { name: "Paper", hex: "#FFFFFF", text: "#111111" },
  { name: "International Red", hex: "#E11D2A", text: "#FFFFFF" },
  { name: "Cobalt", hex: "#0047AB", text: "#FFFFFF" },
  { name: "Signal Yellow", hex: "#FACC15", text: "#111111" },
  { name: "Forest", hex: "#14532D", text: "#FFFFFF" },
];

export const SUGGESTED_TAGS = [
  "LATE NIGHTS",
  "UNSENT",
  "OPM",
  "RAIN",
  "ARCHIVE",
  "NOSTALGIA",
  "CONFESSION",
  "YEARNING",
];

export const SIGNAL_TYPES = [
  { key: "FELT", label: "♥ FELT" },
  { key: "HEARD", label: "HEARD" },
  { key: "SAME FREQUENCY", label: "SAME FREQUENCY" },
];
