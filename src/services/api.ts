import ky from "ky";
import { createSignal } from "solid-js";
import {
  authState,
  logoutClick,
  refreshAccessToken,
  tokenNeedsRefresh,
} from "./auth";

const [profile, setProfile] = createSignal<any>(null);
const [playlists, setPlaylists] = createSignal<any[]>([]);
const [likes, setLikes] = createSignal<any[]>([]);
const [pendingRemovals, setPendingRemovals] = createSignal<string[]>([]);
const [playlistMembership, setPlaylistMembership] = createSignal<
  Record<string, string[]>
>({});

const RATE_LIMIT_KEY = "spotify_rate_limited_until";
const REMOVE_AFTER_KEY = "holt_remove_after_add";

const [rateLimitedUntil, setRateLimitedUntil] = createSignal(
  Number(localStorage.getItem(RATE_LIMIT_KEY) ?? 0),
);

const [removeAfterAdding, setRemoveAfterAddingSignal] = createSignal(
  localStorage.getItem(REMOVE_AFTER_KEY) === "true",
);

export const setRemoveAfterAdding = (value: boolean) => {
  localStorage.setItem(REMOVE_AFTER_KEY, String(value));
  setRemoveAfterAddingSignal(value);
};

export {
  profile,
  playlists,
  likes,
  removeAfterAdding,
  playlistMembership,
  pendingRemovals,
};

export interface PendingChange {
  id: number;
  label: string;
  undo: () => void;
  run: () => Promise<void>;
}

const [pendingChanges, setPendingChanges] = createSignal<PendingChange[]>([]);
export { pendingChanges };

let nextChangeId = 1;

const queueChange = (change: Omit<PendingChange, "id">) => {
  setPendingChanges((prev) => [...prev, { ...change, id: nextChangeId++ }]);
};

export const undoLastChange = () => {
  const list = pendingChanges();
  const last = list[list.length - 1];
  if (!last) return null;

  last.undo();
  setPendingChanges(list.slice(0, -1));
  return last.label;
};

export const undoChange = (id: number) => {
  const list = pendingChanges();
  const change = list.find((item) => item.id === id);
  if (!change) return null;

  change.undo();
  setPendingChanges(list.filter((item) => item.id !== id));
  return change.label;
};

export const discardChanges = () => {
  for (const change of [...pendingChanges()].reverse()) {
    change.undo();
  }
  setPendingChanges([]);
};

export const applyChanges = async () => {
  for (const change of [...pendingChanges()]) {
    await change.run();
    setPendingChanges((prev) => prev.filter((item) => item.id !== change.id));
  }
};

export const rateLimited = () => Date.now() < rateLimitedUntil();

const latchRateLimit = (response: Response) => {
  const seconds = Number(response.headers.get("Retry-After")) || 60;
  const until = Date.now() + seconds * 1000;
  setRateLimitedUntil(until);
  localStorage.setItem(RATE_LIMIT_KEY, String(until));
};

export const api = ky.create({
  prefix: "https://api.spotify.com/v1",
  retry: {
    limit: 1,
    methods: ["get", "post", "put", "delete"],
    afterStatusCodes: [429],
  },
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        let token = authState.token();

        if (token && token !== "mock_token" && tokenNeedsRefresh()) {
          token = (await refreshAccessToken()) ?? token;
        }

        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],

    afterResponse: [
      async ({ response }) => {
        if (response.status === 401) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) logoutClick();
        }

        if (response.status === 403) {
          console.error("Wrong scope granted");
        }

        if (response.status === 429) {
          latchRateLimit(response);
        }

        return response;
      },
    ],
  },
});

export const fetchAndStoreProfile = async () => {
  if (rateLimited()) return;

  if (authState.token() === "mock_token") {
    setProfile({
      id: "mock_user",
      display_name: "Demo User",
      email: "demo@spotify-manager.local",
      images: [{ url: "" }],
    });
    return;
  }

  const data = await api.get("me").json();
  setProfile(data);
};

const trackTotal = (playlist: any) => {
  const total = playlist.items?.total ?? playlist.tracks?.total;
  return typeof total === "number" ? total : 0;
};

export const fetchAndStorePlaylists = async () => {
  if (rateLimited()) return;

  if (authState.token() === "mock_token") {
    setPlaylists([
      {
        id: "playlist_1",
        name: "Lofi Beats for Coding",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 12 },
      },
      {
        id: "playlist_2",
        name: "Late Night Focus",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 8 },
      },
      {
        id: "playlist_3",
        name: "Coding Flow Flow",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 24 },
      },
      {
        id: "playlist_4",
        name: "Commute",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 37 },
      },
      {
        id: "playlist_5",
        name: "Sunday Reset",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 19 },
      },
      {
        id: "playlist_6",
        name: "Deep Focus",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 63 },
      },
      {
        id: "playlist_7",
        name: "Rain Sounds & Static",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 5 },
      },
      {
        id: "playlist_8",
        name: "Basement Tapes",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 41 },
      },
      {
        id: "playlist_9",
        name: "Gym Bangers",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 28 },
      },
      {
        id: "playlist_10",
        name: "One Song Only",
        owner: { id: "mock_user" },
        images: [],
        tracks: { total: 1 },
      },
    ]);
    return;
  }

  const collected: any[] = [];
  let offset = 0;

  while (true) {
    const data: any = await api
      .get(`me/playlists?offset=${offset}&limit=50`)
      .json();

    collected.push(
      ...(data.items ?? [])
        .filter(
          (playlist: any) =>
            playlist.owner?.id === getUserId() ||
            playlist.collaborative === true,
        )
        .map((playlist: any) => ({
          ...playlist,
          tracks: { total: trackTotal(playlist) },
        })),
    );

    if (!data.next) break;
    offset += 50;
  }

  setPlaylists(collected);
};

export const fetchAndStoreLikes = async () => {
  if (rateLimited()) return;

  if (authState.token() === "mock_token") {
    setLikes([
      {
        track: {
          uri: "spotify:track:1",
          name: "Resonance",
          artists: [{ name: "Home" }],
          album: { name: "Odyssey" },
        },
      },
      {
        track: {
          uri: "spotify:track:2",
          name: "After Dark",
          artists: [{ name: "Mr.Kitty" }],
          album: { name: "Time" },
        },
      },
      {
        track: {
          uri: "spotify:track:3",
          name: "Intro",
          artists: [{ name: "The xx" }],
          album: { name: "xx" },
        },
      },
      {
        track: {
          uri: "spotify:track:4",
          name: "Paper Lanterns",
          artists: [{ name: "Hollow Coast" }],
          album: { name: "Harbor Lights" },
        },
      },
      {
        track: {
          uri: "spotify:track:5",
          name: "Static Bloom",
          artists: [{ name: "Vela Nine" }],
          album: { name: "Signal Drift" },
        },
      },
      {
        track: {
          uri: "spotify:track:6",
          name: "Midnight Bakery",
          artists: [{ name: "The Slow Openers" }],
          album: { name: "Rise Schedule" },
        },
      },
      {
        track: {
          uri: "spotify:track:7",
          name: "Copper Wire",
          artists: [{ name: "June Alvarado" }],
          album: { name: "Small Machines" },
        },
      },
      {
        track: {
          uri: "spotify:track:8",
          name: "Glasshouse",
          artists: [{ name: "Ivory Margin" }],
          album: { name: "Transparent Weather" },
        },
      },
      {
        track: {
          uri: "spotify:track:9",
          name: "Neon Harvest",
          artists: [{ name: "Prairie Static" }],
          album: { name: "Combine" },
        },
      },
      {
        track: {
          uri: "spotify:track:10",
          name: "Saltwater Hymn",
          artists: [{ name: "Low Tide Choir" }],
          album: { name: "Estuary" },
        },
      },
      {
        track: {
          uri: "spotify:track:11",
          name: "Domino Teeth",
          artists: [{ name: "Rook & County" }],
          album: { name: "Greyscale" },
        },
      },
      {
        track: {
          uri: "spotify:track:12",
          name: "Slow Elevator",
          artists: [{ name: "Madeline Ferrer" }],
          album: { name: "Vertical" },
        },
      },
      {
        track: {
          uri: "spotify:track:13",
          name: "Blue Hour Traffic",
          artists: [{ name: "The Commuter Club" }],
          album: { name: "Rush" },
        },
      },
      {
        track: {
          uri: "spotify:track:14",
          name: "Velvet Ration",
          artists: [{ name: "Sable Court" }],
          album: { name: "Allotment" },
        },
      },
      {
        track: {
          uri: "spotify:track:15",
          name: "Thin Ice Waltz",
          artists: [{ name: "Kestrel Bloom" }],
          album: { name: "February" },
        },
      },
      {
        track: {
          uri: "spotify:track:16",
          name: "Rooftop Pool",
          artists: [{ name: "Marisol Vane" }],
          album: { name: "Heat Index" },
        },
      },
      {
        track: {
          uri: "spotify:track:17",
          name: "Every Third Light",
          artists: [{ name: "North Margin" }],
          album: { name: "Civic" },
        },
      },
      {
        track: {
          uri: "spotify:track:18",
          name: "Bitter Orange",
          artists: [{ name: "Cassia Rowe" }],
          album: { name: "Peel" },
        },
      },
      {
        track: {
          uri: "spotify:track:19",
          name: "Ghost Frequency",
          artists: [{ name: "Low Orbit" }],
          album: { name: "Broadcast" },
        },
      },
      {
        track: {
          uri: "spotify:track:20",
          name: "Handwriting",
          artists: [{ name: "Elias Poe" }],
          album: { name: "Marginalia" },
        },
      },
      {
        track: {
          uri: "spotify:track:21",
          name: "Neon Signs in Rain",
          artists: [{ name: "Taro Field" }],
          album: { name: "Kyoto Tape" },
        },
      },
      {
        track: {
          uri: "spotify:track:22",
          name: "Museum Hours",
          artists: [{ name: "The Quiet Docent" }],
          album: { name: "Gallery" },
        },
      },
      {
        track: {
          uri: "spotify:track:23",
          name: "Half-Life of Summer",
          artists: [{ name: "Sunroom Kids" }],
          album: { name: "Porchlight" },
        },
      },
      {
        track: {
          uri: "spotify:track:24",
          name: "Feral Garden",
          artists: [{ name: "Wilding" }],
          album: { name: "Allotment II" },
        },
      },
      {
        track: {
          uri: "spotify:track:25",
          name: "Postcard Weather",
          artists: [{ name: "Maritime" }],
          album: { name: "Coastal" },
        },
      },
      {
        track: {
          uri: "spotify:track:26",
          name: "Second Coffee",
          artists: [{ name: "Bell & Basket" }],
          album: { name: "Morning Shift" },
        },
      },
      {
        track: {
          uri: "spotify:track:27",
          name: "Glass Elevator Music",
          artists: [{ name: "Atrium" }],
          album: { name: "Lobby" },
        },
      },
      {
        track: {
          uri: "spotify:track:28",
          name: "Driver's Side",
          artists: [{ name: "Lyle Grant" }],
          album: { name: "County Line" },
        },
      },
      {
        track: {
          uri: "spotify:track:29",
          name: "Slow Riot",
          artists: [{ name: "Concrete Garden" }],
          album: { name: "Civic Duty" },
        },
      },
      {
        track: {
          uri: "spotify:track:30",
          name: "Untitled (Harbor)",
          artists: [{ name: "Anon." }],
          album: { name: "Field Recordings" },
        },
      },
      {
        track: {
          uri: "spotify:track:31",
          name: "Paper Cup Crown",
          artists: [{ name: "The Vending Machines" }],
          album: { name: "Breakroom" },
        },
      },
      {
        track: {
          uri: "spotify:track:32",
          name: "Lunar Commute",
          artists: [{ name: "Niwa" }],
          album: { name: "Transit" },
        },
      },
      {
        track: {
          uri: "spotify:track:33",
          name: "Fishbowl",
          artists: [{ name: "Marlow Petit" }],
          album: { name: "Domestic" },
        },
      },
      {
        track: {
          uri: "spotify:track:34",
          name: "Cold Open",
          artists: [{ name: "The Cold Opens" }],
          album: { name: "Pilot" },
        },
      },
      {
        track: {
          uri: "spotify:track:35",
          name: "Salt Flat",
          artists: [{ name: "Dune Radio" }],
          album: { name: "Basin" },
        },
      },
      {
        track: {
          uri: "spotify:track:36",
          name: "Void Where Prohibited",
          artists: [{ name: "Small Print" }],
          album: { name: "Terms" },
        },
      },
      {
        track: {
          uri: "spotify:track:37",
          name: "Bright Noise",
          artists: [{ name: "Cassette Sunday" }],
          album: { name: "Analog" },
        },
      },
      {
        track: {
          uri: "spotify:track:38",
          name: "Wisteria",
          artists: [{ name: "Ada Pell" }],
          album: { name: "Garden State" },
        },
      },
      {
        track: {
          uri: "spotify:track:39",
          name: "Last Bus Home",
          artists: [{ name: "The Night Checkers" }],
          album: { name: "Terminus" },
        },
      },
      {
        track: {
          uri: "spotify:track:40",
          name: "Hum of the Fridge",
          artists: [{ name: "Quiet Hours" }],
          album: { name: "Domestic II" },
        },
      },
    ]);
    return;
  }

  const collected: any[] = [];
  let offset = 0;

  while (true) {
    const data: any = await api
      .get(`me/tracks?offset=${offset}&limit=50`)
      .json();

    collected.push(...(data.items ?? []));

    if (!data.next) break;
    offset += 50;
  }

  setLikes(collected);
};

const rememberMembership = (trackUri: string, playlistName: string) => {
  setPlaylistMembership((prev) => {
    const existing = prev[trackUri] ?? [];
    if (existing.includes(playlistName)) return prev;
    return { ...prev, [trackUri]: [...existing, playlistName] };
  });
};

const forgetMembership = (trackUri: string, playlistName: string) => {
  setPlaylistMembership((prev) => {
    const existing = prev[trackUri];
    if (!existing?.includes(playlistName)) return prev;

    const remaining = existing.filter((name) => name !== playlistName);
    const next = { ...prev };
    if (remaining.length > 0) next[trackUri] = remaining;
    else delete next[trackUri];
    return next;
  });
};

export const fetchPlaylistMembership = async () => {
  if (rateLimited()) return;

  if (authState.token() === "mock_token") {
    setPlaylistMembership({
      "spotify:track:1": [
        "Lofi Beats for Coding",
        "Late Night Focus",
        "Coding Flow Flow",
      ],
      "spotify:track:2": ["Late Night Focus"],
      "spotify:track:5": ["Coding Flow Flow", "Late Night Focus"],
      "spotify:track:12": ["Commute", "Deep Focus"],
      "spotify:track:9": ["Lofi Beats for Coding"],
      "spotify:track:14": ["Coding Flow Flow"],
      "spotify:track:21": ["Lofi Beats for Coding", "Coding Flow Flow"],
      "spotify:track:28": ["Late Night Focus", "Lofi Beats for Coding"],
      "spotify:track:39": [
        "Late Night Focus",
        "Sunday Reset",
        "Basement Tapes",
      ],
    });
    return;
  }

  for (const playlist of playlists()) {
    try {
      const names: string[] = [];
      let offset = 0;

      while (true) {
        const path = `playlists/${playlist.id}/items?offset=${offset}&limit=100`;
        const data: any = await api
          .get(`${path}&fields=items(item(uri)),next`)
          .json()
          .catch(() => api.get(path).json());

        for (const entry of data.items ?? []) {
          const uri = entry?.item?.uri;
          if (uri) names.push(uri);
        }

        if (!data.next) break;
        offset += 100;
      }

      setPlaylistMembership((prev) => {
        const next = { ...prev };
        for (const uri of names) {
          const existing = next[uri] ?? [];
          if (!existing.includes(playlist.name)) {
            next[uri] = [...existing, playlist.name];
          }
        }
        return next;
      });
    } catch (err) {
      console.error(`Could not read items of "${playlist.name}"`, err);
      return;
    }
  }
};

export const removeFromLikedSongs = async (trackUri: string) => {
  const exists = likes().some((like) => like.track?.uri === trackUri);
  if (!exists || pendingRemovals().includes(trackUri)) return;

  const label =
    likes().find((like) => like.track?.uri === trackUri)?.track?.name ?? "song";

  setPendingRemovals((prev) => [...prev, trackUri]);

  queueChange({
    label: `Remove "${label}" from Liked Songs`,
    undo: () =>
      setPendingRemovals((prev) => prev.filter((uri) => uri !== trackUri)),
    run: async () => {
      if (authState.token() !== "mock_token") {
        await api.delete(`me/library?uris=${encodeURIComponent(trackUri)}`);
      }

      setPendingRemovals((prev) => prev.filter((uri) => uri !== trackUri));
      setLikes((prev) => prev.filter((like) => like.track?.uri !== trackUri));
    },
  });
};

export const createPlaylist = async (
  name: string,
  description: string,
  isPublic: boolean,
  trackUris: string[] = [],
) => {
  const tempId = `temp_${Date.now()}`;
  const draft = {
    id: tempId,
    name,
    description,
    owner: { id: getUserId() },
    images: [],
    tracks: { total: trackUris.length },
  };

  setPlaylists((prev) => [draft, ...prev]);
  for (const uri of trackUris) rememberMembership(uri, name);

  queueChange({
    label: `Create "${name}"${trackUris.length ? ` with ${trackUris.length} track` : ""}`,
    undo: () => {
      setPlaylists((prev) => prev.filter((playlist) => playlist.id !== tempId));
      for (const uri of trackUris) forgetMembership(uri, name);
    },
    run: async () => {
      if (authState.token() === "mock_token") return;

      const created: any = await api
        .post("me/playlists", { json: { name, description, public: isPublic } })
        .json();

      if (trackUris.length > 0) {
        await api
          .post(`playlists/${created.id}/tracks`, { json: { uris: trackUris } })
          .json();
      }

      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === tempId ? { ...playlist, id: created.id } : playlist,
        ),
      );
    },
  });

  return draft;
};

export const getUserDisplayName = () => profile()?.display_name ?? "";
export const getUserEmail = () => profile()?.email ?? "";
export const getUserProfileImage = () => profile()?.images?.[0]?.url ?? "";
export const getUserId = () => profile()?.id ?? "";
export const getPlaylists = () => playlists();
export const getLikes = () => likes();

export const addTrackToPlaylist = async (
  playlistId: string,
  trackUri: string,
  trackName: string,
  playlistName: string,
) => {
  if (rateLimited()) return;

  const bump = (delta: number) =>
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              tracks: {
                ...playlist.tracks,
                total: Math.max(0, (playlist.tracks?.total ?? 0) + delta),
              },
            }
          : playlist,
      ),
    );

  bump(1);
  rememberMembership(trackUri, playlistName);

  queueChange({
    label: `Add "${trackName}" to "${playlistName}"`,
    undo: () => {
      bump(-1);
      forgetMembership(trackUri, playlistName);
    },
    run: async () => {
      if (authState.token() !== "mock_token") {
        await api
          .post(`playlists/${playlistId}/tracks`, {
            json: { uris: [trackUri] },
          })
          .json();
      }
    },
  });
};
