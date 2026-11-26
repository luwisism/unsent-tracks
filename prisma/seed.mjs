import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fetchItunesTrack(query) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`
    );
    const data = await res.json();
    const item = data.results?.[0];
    if (!item) return null;
    return {
      trackId: String(item.trackId),
      trackName: item.trackName,
      artistName: item.artistName,
      albumArt: (item.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
      previewUrl: item.previewUrl || null,
    };
  } catch {
    return null;
  }
}

async function fetchSyncedLyrics(trackName, artistName) {
  try {
    const res = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(
        trackName
      )}&artist_name=${encodeURIComponent(artistName)}`,
      { headers: { "User-Agent": "SideB-Seed/2.0" } }
    );
    const data = await res.json();
    const match = Array.isArray(data)
      ? data.find((d) => d.syncedLyrics || d.plainLyrics)
      : null;
    if (!match) return { excerpt: null, syncedJson: null };

    const parsed = [];
    if (match.syncedLyrics) {
      for (const raw of match.syncedLyrics.split("\n")) {
        const m = raw.match(/^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)$/);
        if (m && m[3].trim()) {
          parsed.push({
            time: parseInt(m[1], 10) * 60 + parseFloat(m[2]),
            text: m[3].trim(),
          });
        }
      }
    }

    const plainLines = (match.plainLyrics || "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("["));

    const excerpt =
      plainLines.length >= 2
        ? plainLines.slice(0, 2).join("\n")
        : parsed.length >= 2
        ? parsed.slice(0, 2).map((p) => p.text).join("\n")
        : null;

    return {
      excerpt,
      syncedJson: parsed.length > 0 ? JSON.stringify(parsed) : null,
    };
  } catch {
    return { excerpt: null, syncedJson: null };
  }
}

const USERS_SEED = [
  {
    username: "velvet_02",
    passcode: "1234",
    monogramColor: "#E11D2A",
    bio: "Collecting unfinished sentences from 2 AM jeepney rides.",
    archetype: "NIGHT OWL",
    tags: "LATE NIGHTS, OPM, YEARNING",
    frequency: "02:14 AM",
    coordinates: "07.0731° N, 125.6128° E",
    anthemQuery: "Multo Cup of Joe",
  },
  {
    username: "static_k",
    passcode: "1234",
    monogramColor: "#0047AB",
    bio: "Archivist of unanswered texts and damp pavement.",
    archetype: "ARCHIVIST",
    tags: "ARCHIVE, RAIN, UNSENT",
    frequency: "01:45 AM",
    coordinates: "14.5995° N, 120.9842° E",
    anthemQuery: "About You The 1975",
  },
  {
    username: "paper_ghost",
    passcode: "1234",
    monogramColor: "#111111",
    bio: "I leave songs where I used to leave paragraphs.",
    archetype: "CONFESSOR",
    tags: "CONFESSION, NOSTALGIA, UNSENT",
    frequency: "03:03 AM",
    coordinates: "35.6762° N, 139.6503° E",
    anthemQuery: "Sailor Song Gigi Perez",
  },
  {
    username: "tape_hiss",
    passcode: "1234",
    monogramColor: "#14532D",
    bio: "Side B always holds the track nobody skips.",
    archetype: "CURATOR",
    tags: "OPM, NOSTALGIA, ARCHIVE",
    frequency: "11:58 PM",
    coordinates: "10.3157° N, 123.8854° E",
    anthemQuery: "Kabisado IV of Spades",
  },
  {
    username: "nocturne_99",
    passcode: "1234",
    monogramColor: "#FACC15",
    bio: "Listening through wired earphones in the back seat.",
    archetype: "DRIFTER",
    tags: "LATE NIGHTS, RAIN, YEARNING",
    frequency: "04:12 AM",
    coordinates: "03.1390° N, 101.6869° E",
    anthemQuery: "Come Adrianne Lenker",
  },
  {
    username: "blue_hour",
    passcode: "1234",
    monogramColor: "#0047AB",
    bio: "4:55 AM sky before the city remembers our names.",
    archetype: "OBSERVER",
    tags: "NOSTALGIA, RAIN, LATE NIGHTS",
    frequency: "04:55 AM",
    coordinates: "01.3521° N, 103.8198° E",
    anthemQuery: "For Crying Out Loud Finneas",
  },
  {
    username: "sideb_loyce",
    passcode: "1234",
    monogramColor: "#111111",
    bio: "Frequency check. Building archives out of static.",
    archetype: "ARCHITECT",
    tags: "ARCHIVE, OPM, CONFESSION",
    frequency: "02:00 AM",
    coordinates: "07.1907° N, 125.4553° E",
    anthemQuery: "Drag Path Twenty One Pilots",
  },
  {
    username: "cassette_m",
    passcode: "1234",
    monogramColor: "#E11D2A",
    bio: "Rewinding the same 18 seconds until it stops hurting.",
    archetype: "ROMANTIC",
    tags: "YEARNING, CONFESSION, OPM",
    frequency: "00:42 AM",
    coordinates: "16.4023° N, 120.5960° E",
    anthemQuery: "Tingin Cup of Joe",
  },
];

const NOTES_SEED = [
  {
    author: "velvet_02",
    recipient: "J.",
    message: "You left your umbrella by the door last Tuesday. I kept it in case it rains on your side of town again.",
    moodColor: "#E11D2A",
    trackQuery: "Multo Cup of Joe",
    clipStart: 5,
    clipEnd: 30,
  },
  {
    author: "static_k",
    recipient: "THE VERSION OF US IN OCTOBER",
    message: "We were three minutes away from saying the truth at the crosswalk, then the light turned green and we both pretended we were late.",
    moodColor: "#0047AB",
    trackQuery: "About You The 1975",
    clipStart: 0,
    clipEnd: 28,
  },
  {
    author: "paper_ghost",
    recipient: "M.",
    message: "Every time this chorus hits I still check my phone like you're going to send a voice note at 2 AM.",
    moodColor: "#111111",
    trackQuery: "Sailor Song Gigi Perez",
    clipStart: 4,
    clipEnd: 29,
  },
  {
    author: "tape_hiss",
    recipient: "K.A.",
    message: "If you ever find this frequency, know that I memorized every playlist you made for me before you deleted your account.",
    moodColor: "#14532D",
    trackQuery: "Kabisado IV of Spades",
    clipStart: 0,
    clipEnd: 30,
  },
  {
    author: "nocturne_99",
    recipient: "SOMEONE ON EDSA",
    message: "Saw someone wearing your exact grey hoodie on the train platform. Almost called out your name.",
    moodColor: "#FACC15",
    trackQuery: "Come Adrianne Lenker",
    clipStart: 6,
    clipEnd: 30,
  },
  {
    author: "blue_hour",
    recipient: "R.",
    message: "I locked this one behind our old apartment number so only you would ever read the second half.",
    moodColor: "#FFFFFF",
    trackQuery: "For Crying Out Loud Finneas",
    clipStart: 2,
    clipEnd: 27,
    passcode: "1234",
    passcodeHint: "Try 1234 — our old gate code",
  },
  {
    author: "sideb_loyce",
    recipient: "UNSENT TO THE ARCHIVE",
    message: "Some conversations don't end with goodbye—they just fade out like the last twelve seconds of a B-side track.",
    moodColor: "#111111",
    trackQuery: "Drag Path Twenty One Pilots",
    clipStart: 8,
    clipEnd: 30,
  },
  {
    author: "cassette_m",
    recipient: "C.",
    message: "Across a crowded room I still look for your eyes first before I even find the exit.",
    moodColor: "#E11D2A",
    trackQuery: "Tingin Cup of Joe",
    clipStart: 0,
    clipEnd: 30,
  },
  {
    author: "velvet_02",
    recipient: "D.",
    message: "Encrypted because I wasn't brave enough to leave this unlocked on the main wall.",
    moodColor: "#0047AB",
    trackQuery: "Ikaw Lang NOBITA",
    clipStart: 3,
    clipEnd: 28,
    passcode: "0000",
    passcodeHint: "Four zeros (0000)",
  },
  {
    author: "static_k",
    recipient: "L.",
    message: "You asked me what I was listening to when we stopped talking. It was this exact bridge on repeat.",
    moodColor: "#14532D",
    trackQuery: "Mundo IV of Spades",
    clipStart: 0,
    clipEnd: 26,
  },
  {
    author: "paper_ghost",
    recipient: "A.",
    message: "No hard feelings, just heavy static whenever your name comes up in group chats.",
    moodColor: "#FFFFFF",
    trackQuery: "Slow Dancing in the Dark Joji",
    clipStart: 5,
    clipEnd: 30,
  },
  {
    author: "cassette_m",
    recipient: "S.",
    message: "I saved you a window seat on the last trip home, even though I knew you weren't coming.",
    moodColor: "#FACC15",
    trackQuery: "Pasilyo SunKissed Lola",
    clipStart: 8,
    clipEnd: 30,
  },
];

const REPLIES_SEED = [
  { noteIdx: 0, sender: "static_k", trackQuery: "Pasilyo SunKissed Lola" },
  { noteIdx: 0, sender: "cassette_m", trackQuery: "Ikaw Lang NOBITA" },
  { noteIdx: 1, sender: "velvet_02", trackQuery: "Robbers The 1975" },
  { noteIdx: 1, sender: "paper_ghost", trackQuery: "Apocalypse Cigarettes After Sex" },
  { noteIdx: 2, sender: "nocturne_99", trackQuery: "Scott Street Phoebe Bridgers" },
  { noteIdx: 3, sender: "sideb_loyce", trackQuery: "Mundo IV of Spades" },
  { noteIdx: 6, sender: "velvet_02", trackQuery: "Multo Cup of Joe" },
  { noteIdx: 7, sender: "blue_hour", trackQuery: "Tahanan Adie" },
];

const MIXTAPES_SEED = [
  {
    title: "VOL. 01 — 2:00 AM JEEPNEY WINDOW",
    subtitle: "OPM tracks for rain on glass and unsent drafts",
    coverColor: "#E11D2A",
    creator: "velvet_02",
    noteIndices: [0, 3, 7, 9, 11],
  },
  {
    title: "VOL. 02 — STATIC & CROSSWALKS",
    subtitle: "Late-night indie frequencies for people who overthink",
    coverColor: "#0047AB",
    creator: "static_k",
    noteIndices: [1, 2, 4, 6, 10],
  },
  {
    title: "VOL. 03 — B-SIDE CONFESSIONS",
    subtitle: "Tracks that only make sense after midnight",
    coverColor: "#111111",
    creator: "sideb_loyce",
    noteIndices: [6, 0, 1, 2, 7],
  },
];

async function main() {
  console.log("Wiping existing SIDE B database records...");
  await prisma.activity.deleteMany();
  await prisma.mixtapeItem.deleteMany();
  await prisma.mixtape.deleteMany();
  await prisma.songReply.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.note.deleteMany();
  await prisma.user.deleteMany();

  // Reset SQLite autoincrement counters
  await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence;`).catch(() => {});

  console.log("Seeding users with iTunes anthems...");
  const usersByHandle = {};
  const trackCache = {};

  async function getTrack(query) {
    if (trackCache[query]) return trackCache[query];
    const t = await fetchItunesTrack(query);
    const fallback = {
      trackId: `seed-${Buffer.from(query).toString("hex").slice(0, 10)}`,
      trackName: query.split(" ").slice(0, 2).join(" "),
      artistName: query.split(" ").slice(2).join(" ") || "Archive Artist",
      albumArt: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80",
      previewUrl: null,
    };
    const resolved = t || fallback;
    const lyrics = await fetchSyncedLyrics(resolved.trackName, resolved.artistName);
    const full = { ...resolved, ...lyrics };
    trackCache[query] = full;
    return full;
  }

  for (const u of USERS_SEED) {
    const anthem = await getTrack(u.anthemQuery);
    const created = await prisma.user.create({
      data: {
        username: u.username,
        passcode: u.passcode,
        monogramColor: u.monogramColor,
        bio: u.bio,
        archetype: u.archetype,
        tags: u.tags,
        frequency: u.frequency,
        coordinates: u.coordinates,
        anthemTrackId: anthem.trackId,
        anthemTrackName: anthem.trackName,
        anthemArtist: anthem.artistName,
        anthemAlbumArt: anthem.albumArt,
        anthemPreview: anthem.previewUrl,
      },
    });
    usersByHandle[u.username] = created;
  }

  const allUsers = Object.values(usersByHandle);

  console.log("Seeding follow graph & FOLLOWED activities...");
  const followPairs = [
    ["sideb_loyce", "velvet_02"],
    ["sideb_loyce", "static_k"],
    ["sideb_loyce", "paper_ghost"],
    ["sideb_loyce", "cassette_m"],
    ["velvet_02", "sideb_loyce"],
    ["velvet_02", "static_k"],
    ["velvet_02", "tape_hiss"],
    ["static_k", "sideb_loyce"],
    ["static_k", "velvet_02"],
    ["static_k", "blue_hour"],
    ["paper_ghost", "velvet_02"],
    ["paper_ghost", "nocturne_99"],
    ["tape_hiss", "static_k"],
    ["tape_hiss", "sideb_loyce"],
    ["nocturne_99", "blue_hour"],
    ["blue_hour", "cassette_m"],
    ["cassette_m", "velvet_02"],
    ["cassette_m", "sideb_loyce"],
  ];

  for (const [followerHandle, followingHandle] of followPairs) {
    const follower = usersByHandle[followerHandle];
    const following = usersByHandle[followingHandle];
    if (!follower || !following) continue;
    await prisma.follow.create({
      data: { followerId: follower.id, followingId: following.id },
    });
    await prisma.activity.create({
      data: {
        userId: follower.id,
        type: "FOLLOWED",
        summary: `Tuned into @${following.username}'s frequency`,
        target: following.username,
      },
    });
  }

  console.log("Seeding notes & POSTED activities...");
  const createdNotes = [];
  for (let i = 0; i < NOTES_SEED.length; i++) {
    const n = NOTES_SEED[i];
    const author = usersByHandle[n.author];
    const track = await getTrack(n.trackQuery);
    const createdAt = new Date(Date.now() - (NOTES_SEED.length - i) * 1000 * 60 * 37);

    const note = await prisma.note.create({
      data: {
        recipient: n.recipient,
        message: n.message,
        moodColor: n.moodColor,
        trackId: track.trackId,
        trackName: track.trackName,
        artistName: track.artistName,
        albumArt: track.albumArt,
        previewUrl: track.previewUrl,
        lyricExcerpt: track.excerpt,
        syncedLyrics: track.syncedJson,
        clipStart: n.clipStart,
        clipEnd: n.clipEnd,
        passcode: n.passcode || null,
        passcodeHint: n.passcodeHint || null,
        listenCount: 4 + i * 3,
        userId: author.id,
        createdAt,
      },
    });
    createdNotes.push(note);

    await prisma.activity.create({
      data: {
        userId: author.id,
        type: "POSTED",
        summary: `Transmitted "${track.trackName}" to ${n.recipient}`,
        noteId: note.id,
        createdAt,
      },
    });
  }

  console.log("Seeding reactions (FELT, HEARD, SAME FREQUENCY) & REACTED activities...");
  const SIGNAL_POOL = ["FELT", "HEARD", "SAME FREQUENCY"];
  for (let nIdx = 0; nIdx < createdNotes.length; nIdx++) {
    const note = createdNotes[nIdx];
    for (let uIdx = 0; uIdx < allUsers.length; uIdx++) {
      const reactor = allUsers[uIdx];
      // Deterministic varied distribution so every note has realistic reactions
      for (let sIdx = 0; sIdx < SIGNAL_POOL.length; sIdx++) {
        if ((nIdx + uIdx * 2 + sIdx) % 3 === 0) {
          const sigType = SIGNAL_POOL[sIdx];
          await prisma.reaction.create({
            data: {
              noteId: note.id,
              type: sigType,
              userId: reactor.id,
            },
          });
          await prisma.activity.create({
            data: {
              userId: reactor.id,
              type: "REACTED",
              summary: `Sent ${sigType} signal on note to ${note.recipient}`,
              noteId: note.id,
            },
          });
        }
      }
    }
  }

  console.log("Seeding song replies & REPLIED activities...");
  for (const r of REPLIES_SEED) {
    const note = createdNotes[r.noteIdx];
    const sender = usersByHandle[r.sender];
    const track = await getTrack(r.trackQuery);
    if (!note || !sender) continue;

    await prisma.songReply.create({
      data: {
        noteId: note.id,
        trackId: track.trackId,
        trackName: track.trackName,
        artistName: track.artistName,
        albumArt: track.albumArt,
        previewUrl: track.previewUrl,
        lyricExcerpt: track.excerpt,
        senderHandle: sender.username,
      },
    });

    await prisma.activity.create({
      data: {
        userId: sender.id,
        type: "REPLIED",
        summary: `Replied with “${track.trackName}” on note to ${note.recipient}`,
        noteId: note.id,
      },
    });
  }

  console.log("Seeding curated mixtapes...");
  for (const m of MIXTAPES_SEED) {
    const creator = usersByHandle[m.creator];
    const mixtape = await prisma.mixtape.create({
      data: {
        title: m.title,
        subtitle: m.subtitle,
        coverColor: m.coverColor,
        creatorName: creator.username,
        userId: creator.id,
      },
    });

    for (let order = 0; order < m.noteIndices.length; order++) {
      const targetNote = createdNotes[m.noteIndices[order]];
      if (!targetNote) continue;
      await prisma.mixtapeItem.create({
        data: {
          mixtapeId: mixtape.id,
          noteId: targetNote.id,
          order,
        },
      });
    }
  }

  console.log("✅ SIDE B seed completed!");
  console.log("Login with ANY seeded account using passcode: 1234");
  console.log("Accounts:", Object.keys(usersByHandle).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
