import { onMount, For, createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  fetchAndStorePlaylists,
  fetchAndStoreLikes,
  fetchAndStoreProfile,
  getPlaylists,
  getLikes,
  rateLimited,
  addTrackToPlaylist,
} from "../services/api";
import { authState } from "../services/auth";
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  createDraggable,
  createDroppable,
} from "@thisbeyond/solid-dnd";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [toasts, setToasts] = createSignal<Toast[]>([]);
  const [addingTrackId, setAddingTrackId] = createSignal<string | null>(null);
  const [activeDragTrack, setActiveDragTrack] = createSignal<any | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  onMount(async () => {
    if (!authState.isLoggedIn()) {
      return navigate("/login", { replace: true });
    }

    if (!rateLimited()) {
      try {
        setLoading(true);
        await fetchAndStoreProfile();
        await fetchAndStorePlaylists();
        await fetchAndStoreLikes();
        console.log("SSR Conversion Debug - Playlists:", getPlaylists());
        console.log("SSR Conversion Debug - Likes:", getLikes());
      } catch (err) {
        console.error("Error loading home page data:", err);
        showToast("Error loading Spotify library details", "error");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  });

  // Filtered liked tracks based on search query
  const filteredLikes = () => {
    const query = searchQuery().toLowerCase().trim();
    const likesList = getLikes() || [];
    if (!query) return likesList;
    return likesList.filter((like: any) => {
      const title = like.track?.name?.toLowerCase() || "";
      const artists = like.track?.artists?.map((a: any) => a.name.toLowerCase()).join(" ") || "";
      return title.includes(query) || artists.includes(query);
    });
  };

  // Drag & Drop Handler using solid-dnd
  const handleDropTrack = async (playlist: any, track: any) => {
    if (!track || !track.uri) {
      showToast("Could not read drag data", "error");
      return;
    }

    setAddingTrackId(playlist.id);
    try {
      await addTrackToPlaylist(playlist.id, track.uri);
      showToast(`Added "${track.name}" to "${playlist.name}"!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to add track: ${err?.message || "unauthorized or error"}`, "error");
    } finally {
      setAddingTrackId(null);
    }
  };

  const handleDragStart = ({ draggable }: any) => {
    setActiveDragTrack(draggable.data);
  };

  const handleDragOver = () => {
    // No-op
  };

  const handleDragEnd = async ({ draggable, droppable }: any) => {
    setActiveDragTrack(null);

    if (droppable) {
      const playlist = droppable.data;
      const track = draggable.data;
      await handleDropTrack(playlist, track);
    }
  };

  return (
    <DragDropProvider
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <DragDropSensors>
        <div class="relative flex h-[calc(100vh-6rem)] w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
          {/* Toast container */}
          <div class="fixed top-20 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            <For each={toasts()}>
              {(toast) => (
                <div
                  class="flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 animate-slide-in pointer-events-auto max-w-sm backdrop-blur-md"
                  classList={{
                    "bg-surface/95 border-pine text-foam": toast.type === "success",
                    "bg-surface/95 border-love text-rose": toast.type === "error",
                  }}
                >
                  <div class="h-2 w-2 rounded-full" classList={{ "bg-foam": toast.type === "success", "bg-rose": toast.type === "error" }}></div>
                  <p class="text-sm font-medium">{toast.message}</p>
                </div>
              )}
            </For>
          </div>

          <Show
            when={!loading()}
            fallback={
              <div class="flex h-full w-full flex-col items-center justify-center gap-4">
                <div class="h-16 w-16 animate-spin rounded-full border-4 border-pine border-t-transparent"></div>
                <p class="text-subtle font-medium text-lg">Fetching your Spotify Library...</p>
              </div>
            }
          >
            <div class="grid h-full grid-cols-1 gap-6 md:grid-cols-12 overflow-hidden">
              {/* Left Panel: Liked Songs */}
              <section class="flex flex-col rounded-2xl bg-surface border border-overlay/40 p-4 md:col-span-7 lg:col-span-8 overflow-hidden shadow-xl">
                <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 class="text-xl font-bold text-text flex items-center gap-2">
                      Liked Songs
                      <span class="ml-2 rounded-full bg-overlay px-2.5 py-0.5 text-xs text-subtle font-medium border border-highlight-med/30">
                        {getLikes()?.length ?? 0}
                      </span>
                    </h2>
                    <p class="text-xs text-muted">Drag a song and drop it on a playlist to add it</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Search liked songs..."
                    value={searchQuery()}
                    onInput={(e) => setSearchQuery(e.currentTarget.value)}
                    class="w-full sm:w-60 rounded-lg bg-overlay border border-highlight-med px-3 py-1.5 text-sm text-text placeholder-muted focus:border-pine focus:outline-none transition-colors"
                  />
                </div>

                <div class="grow overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
                  <Show
                    when={filteredLikes()?.length > 0}
                    fallback={
                      <div class="flex h-full flex-col items-center justify-center text-muted p-8 text-center">
                        <p class="text-sm">No songs found matching "{searchQuery()}"</p>
                      </div>
                    }
                  >
                    <For each={filteredLikes()}>
                      {(like) => {
                        const draggableInfo = createDraggable(like.track.uri, like.track);
                        return (
                          <div
                            ref={draggableInfo}
                            class="group flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-all cursor-grab active:cursor-grabbing select-none touch-action-none"
                            classList={{
                              "bg-highlight-low/10 hover:bg-highlight-low/30 hover:border-highlight-med/30 hover:scale-[1.005]": !draggableInfo.isActiveDraggable,
                              "opacity-30 border-dashed border-overlay bg-transparent scale-95": draggableInfo.isActiveDraggable,
                            }}
                          >
                            <img
                              class="h-12 w-12 rounded-lg object-cover shadow-md pointer-events-none"
                              src={like.track?.album?.images?.[0]?.url || "/placeholder-album.png"}
                              alt={like.track?.name}
                              loading="lazy"
                            />
                            
                            <div class="flex flex-col min-w-0 flex-1 pointer-events-none">
                              <p class="truncate text-sm font-semibold text-text group-hover:text-foam transition-colors">
                                {like.track?.name}
                              </p>
                              <p class="truncate text-xs text-subtle">
                                {like.track?.artists?.map((artist: any) => artist.name).join(", ") || "Unknown Artist"}
                              </p>
                            </div>

                            <div class="text-xs text-muted pr-2 hidden lg:block max-w-[150px] truncate pointer-events-none">
                              {like.track?.album?.name}
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              </section>

              {/* Right Panel: Playlists */}
              <section class="flex flex-col rounded-2xl bg-surface border border-overlay/40 p-4 md:col-span-5 lg:col-span-4 overflow-hidden shadow-xl">
                <div class="mb-4">
                  <h2 class="text-xl font-bold text-text flex items-center gap-2">
                    Your Playlists
                    <span class="rounded-full bg-overlay px-2.5 py-0.5 text-xs text-subtle font-medium border border-highlight-med/30">
                      {getPlaylists()?.length ?? 0}
                    </span>
                  </h2>
                  <p class="text-xs text-muted">Drop songs here to add them</p>
                </div>

                <div class="grow overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-3">
                  <Show
                    when={getPlaylists()?.length > 0}
                    fallback={
                      <div class="flex h-full flex-col items-center justify-center text-muted p-8 text-center">
                        <p class="text-sm">No writable playlists found</p>
                      </div>
                    }
                  >
                    <For each={getPlaylists()}>
                      {(playlist) => {
                        const droppableInfo = createDroppable(playlist.id, playlist);
                        const isDraggedOver = () => droppableInfo.isActiveDroppable;
                        const isAdding = () => addingTrackId() === playlist.id;

                        return (
                          <div
                            ref={droppableInfo}
                            class="relative flex items-center gap-3 rounded-xl border p-3 transition-all select-none"
                            classList={{
                              "bg-highlight-low/10 border-overlay/60 hover:bg-highlight-low/30 hover:border-highlight-med": !isDraggedOver(),
                              "bg-overlay border-2 border-dashed border-pine scale-[1.02] shadow-lg shadow-pine/10": isDraggedOver(),
                              "opacity-60 pointer-events-none": isAdding(),
                            }}
                          >
                            <img
                              class="h-12 w-12 rounded-lg object-cover shadow-sm pointer-events-none"
                              src={playlist.images?.[0]?.url || "/placeholder-playlist.png"}
                              alt={playlist.name}
                            />
                            <div class="flex flex-col min-w-0 flex-1 pointer-events-none">
                              <p class="truncate text-sm font-semibold text-text group-hover:text-foam">
                                {playlist.name}
                              </p>
                              <p class="text-xs text-subtle">
                                {playlist.tracks?.total ?? 0} tracks
                              </p>
                            </div>

                            {/* Loading / Success Overlays */}
                            <Show when={isAdding()}>
                              <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/80 backdrop-blur-xs">
                                <div class="h-5 w-5 animate-spin rounded-full border-2 border-pine border-t-transparent"></div>
                              </div>
                            </Show>

                            {/* Drop indicators inside the dropzone */}
                            <Show when={isDraggedOver()}>
                              <div class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded bg-pine px-2 py-0.5 text-[10px] font-bold text-app-base uppercase tracking-wider animate-pulse">
                                Drop Here
                              </div>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              </section>
            </div>
          </Show>
        </div>

      {/* Floating Drag Overlay */}
      <DragOverlay>
        <Show when={activeDragTrack()}>
          {(track) => (
            <div
              class="flex items-center gap-3 rounded-xl bg-surface border border-overlay p-2.5 shadow-2xl pointer-events-none select-none w-full"
            >
              <img
                class="h-12 w-12 rounded-lg object-cover shadow-md pointer-events-none"
                src={track().album?.images?.[0]?.url || "/placeholder-album.png"}
                alt={track().name}
              />
              <div class="flex flex-col min-w-0 flex-1 pointer-events-none">
                <p class="truncate text-sm font-semibold text-text">
                  {track().name}
                </p>
                <p class="truncate text-xs text-subtle">
                  {track().artists?.map((artist: any) => artist.name).join(", ") || "Unknown Artist"}
                </p>
              </div>
            </div>
          )}
        </Show>
      </DragOverlay>
      </DragDropSensors>
    </DragDropProvider>
  );
};

export default Home;
