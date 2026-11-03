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

const RATE_LIMIT_KEY = "spotify_rate_limited_until";

const [rateLimitedUntil, setRateLimitedUntil] = createSignal(
  Number(localStorage.getItem(RATE_LIMIT_KEY) ?? 0),
);

export { profile, playlists, likes };

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
      ...(data.items ?? []).filter(
        (playlist: any) => playlist.owner?.id === getUserId(),
      ),
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

export const getUserDisplayName = () => profile()?.display_name ?? "";
export const getUserEmail = () => profile()?.email ?? "";
export const getUserProfileImage = () => profile()?.images?.[0]?.url ?? "";
export const getUserId = () => profile()?.id ?? "";
export const getPlaylists = () => playlists();
export const getLikes = () => likes();

export const addTrackToPlaylist = async (
  playlistId: string,
  trackUri: string,
) => {
  if (rateLimited()) return;

  if (authState.token() !== "mock_token") {
    await api
      .post(`playlists/${playlistId}/tracks`, {
        json: {
          uris: [trackUri],
        },
      })
      .json();
  }

  // Optimistically update the local playlists track total count
  setPlaylists((prev) =>
    prev.map((playlist) => {
      if (playlist.id === playlistId) {
        return {
          ...playlist,
          tracks: {
            ...playlist.tracks,
            total: (playlist.tracks?.total ?? 0) + 1,
          },
        };
      }
      return playlist;
    }),
  );
};
