import { onMount, onCleanup, For, createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  fetchAndStorePlaylists,
  fetchAndStoreLikes,
  fetchAndStoreProfile,
  getPlaylists,
  getLikes,
  rateLimited,
  addTrackToPlaylist,
  createPlaylist,
  removeFromLikedSongs,
  removeAfterAdding,
  setRemoveAfterAdding,
  fetchPlaylistMembership,
  playlistMembership,
  pendingRemovals,
  pendingChanges,
} from "../services/api";
import { authState } from "../services/auth";
import { searchQuery } from "../services/search";
import { Artwork } from "../components/Artwork";
import { FaIcon } from "../components/FaIcon";
import { NewPlaylistModal } from "../components/NewPlaylistModal";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import {
  DragDropProvider,
  DragDropSensors,
  createDraggable,
  createDroppable,
} from "@thisbeyond/solid-dnd";
import type { CollisionDetector } from "@thisbeyond/solid-dnd";

const NewPlaylistRow = (props: { onActivate: () => void }) => {
  const droppable = createDroppable("new-playlist", { kind: "new-playlist" });

  return (
    <button
      type="button"
      ref={droppable}
      onClick={props.onActivate}
      class="flex w-full items-center gap-3 border-b border-overlay/30 px-2 py-2.5 text-left transition-colors select-none hover:bg-highlight-low/40"
      classList={{
        "bg-overlay ring-2 ring-pine ring-inset": droppable.isActiveDroppable,
      }}
    >
      <span class="flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-highlight-med text-subtle">
        <FaIcon icon={faPlus} class="size-5" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-sm font-semibold text-text">
          {droppable.isActiveDroppable ? "Drop to create it" : "New playlist"}
        </span>
        <span class="text-xs text-subtle">
          {droppable.isActiveDroppable
            ? "Starts with this song"
            : "Drop a song here, or click"}
        </span>
      </span>
    </button>
  );
};

const TrashTarget = () => {
  const droppable = createDroppable("remove-from-likes", {
    kind: "remove-from-likes",
  });

  return (
    <div class="pointer-events-none fixed inset-x-0 bottom-16 z-40 flex justify-center">
      <div
        ref={droppable}
        class="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-dashed px-4 py-2 text-sm font-medium transition-all"
        classList={{
          "border-overlay bg-surface/95 text-subtle":
            !droppable.isActiveDroppable,
          "border-love bg-love/15 text-love": droppable.isActiveDroppable,
        }}
      >
        <FaIcon icon={faTrash} class="size-4" />
        {droppable.isActiveDroppable
          ? "Release to remove from Liked Songs"
          : "Drop here to remove from Liked Songs"}
      </div>
    </div>
  );
};

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal(true);
  const [toasts, setToasts] = createSignal<Toast[]>([]);
  const [addingTrackId, setAddingTrackId] = createSignal<string | null>(null);
  const [activeDragTrack, setActiveDragTrack] = createSignal<any | null>(null);
  const [dragPoint, setDragPoint] = createSignal<{
    x: number;
    y: number;
  } | null>(null);
  const [modalOpen, setModalOpen] = createSignal(false);
  const [pendingTrack, setPendingTrack] = createSignal<any | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
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
        void fetchPlaylistMembership();
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
      const artists =
        like.track?.artists?.map((a: any) => a.name.toLowerCase()).join(" ") ||
        "";
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
      await addTrackToPlaylist(
        playlist.id,
        track.uri,
        track.name,
        playlist.name,
      );

      if (removeAfterAdding()) {
        await removeFromLikedSongs(track.uri);
      }

      showToast(`Queued "${track.name}" → "${playlist.name}"`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(
        `Failed to add track: ${err?.message || "unauthorized or error"}`,
        "error",
      );
    } finally {
      setAddingTrackId(null);
    }
  };

  const ghostPosition = (point: { x: number; y: number }) => ({
    left: `${Math.min(Math.max(point.x - 112, 8), window.innerWidth - 232)}px`,
    top: `${Math.min(Math.max(point.y - 25, 8), window.innerHeight - 60)}px`,
  });

  const handleRemoveTrack = async (track: any) => {
    try {
      await removeFromLikedSongs(track.uri);
      showToast(`Queued unlink of "${track.name}"`, "success");
    } catch (err: any) {
      console.error(err);
      showToast("Could not remove that song", "error");
    }
  };

  const pointerWithin: CollisionDetector = (_draggable, droppables) => {
    const point = dragPoint();
    if (!point) return null;

    return (
      droppables.find((droppable) => {
        const { left, top, right, bottom } = droppable.layout;
        return (
          point.x >= left &&
          point.x <= right &&
          point.y >= top &&
          point.y <= bottom
        );
      }) ?? null
    );
  };

  let dragCancelled = false;

  const handleDragStart = ({ draggable }: any) => {
    dragCancelled = false;
    setActiveDragTrack(draggable.data);
  };

  onMount(() => {
    const trackPointer = (event: PointerEvent) => {
      if (activeDragTrack())
        setDragPoint({ x: event.clientX, y: event.clientY });
    };

    // Escape ends a drag without dropping; the synthetic pointerup detaches the sensor
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !activeDragTrack()) return;
      dragCancelled = true;
      activeDragTrack() && setActiveDragTrack(null);
      setDragPoint(null);
      document.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
        }),
      );
    };

    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (pendingChanges().length > 0) event.preventDefault();
    };

    document.addEventListener("pointermove", trackPointer);
    document.addEventListener("keydown", cancelOnEscape);
    window.addEventListener("beforeunload", warnUnsaved);

    onCleanup(() => {
      document.removeEventListener("pointermove", trackPointer);
      document.removeEventListener("keydown", cancelOnEscape);
      window.removeEventListener("beforeunload", warnUnsaved);
    });
  });

  const handleDragOver = () => {
    // No-op
  };

  const handleDragEnd = async ({ draggable, droppable }: any) => {
    setActiveDragTrack(null);
    setDragPoint(null);

    if (dragCancelled) {
      dragCancelled = false;
      return;
    }

    if (!droppable) return;

    if (droppable.data?.kind === "new-playlist") {
      setPendingTrack(draggable.data);
      setModalOpen(true);
      return;
    }

    if (droppable.data?.kind === "remove-from-likes") {
      await handleRemoveTrack(draggable.data);
      return;
    }

    await handleDropTrack(droppable.data, draggable.data);
  };

  return (
    <DragDropProvider
      collisionDetector={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <DragDropSensors>
        <div class="relative flex size-full min-h-0 max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
          {/* Toast container */}
          <div class="pointer-events-none fixed bottom-20 left-6 z-50 flex flex-col gap-2">
            <For each={toasts()}>
              {(toast) => (
                <div
                  class="pointer-events-auto flex max-w-sm animate-slide-in items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md transition-all duration-300"
                  classList={{
                    "border-pine bg-surface/95 text-foam":
                      toast.type === "success",
                    "border-love bg-surface/95 text-rose":
                      toast.type === "error",
                  }}
                >
                  <div
                    class="size-2 rounded-full"
                    classList={{
                      "bg-foam": toast.type === "success",
                      "bg-rose": toast.type === "error",
                    }}
                  ></div>
                  <p class="text-sm font-medium">{toast.message}</p>
                </div>
              )}
            </For>
          </div>

          <Show
            when={!loading()}
            fallback={
              <div class="flex size-full flex-col items-center justify-center gap-4">
                <div class="size-16 animate-spin rounded-full border-4 border-pine border-t-transparent"></div>
                <p class="text-lg font-medium text-subtle">
                  Fetching your Spotify Library...
                </p>
              </div>
            }
          >
            <div class="grid h-full min-h-0 grid-cols-1 gap-6 overflow-hidden md:grid-cols-12">
              {/* Left Panel: Liked Songs */}
              <section class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-overlay/40 bg-surface p-5 shadow-xl md:col-span-7 lg:col-span-8">
                <h2 class="mb-4 text-2xl font-bold tracking-tight text-text">
                  Liked Songs
                  <span class="ml-2 align-baseline text-sm font-medium text-pine">
                    {getLikes()?.length ?? 0}
                  </span>
                </h2>

                <div class="custom-scrollbar grow overflow-y-auto pr-1">
                  <Show
                    when={filteredLikes()?.length > 0}
                    fallback={
                      <div class="flex h-full flex-col items-center justify-center gap-1 p-8 text-center text-muted">
                        <p class="text-sm">
                          {rateLimited()
                            ? "Spotify is rate limiting requests. Try again in a few minutes."
                            : searchQuery()
                              ? `No songs found matching "${searchQuery()}"`
                              : "No liked songs found"}
                        </p>
                        <Show when={!rateLimited() && !searchQuery()}>
                          <p class="text-xs text-muted">
                            Drag a song onto a playlist to sort it
                          </p>
                        </Show>
                      </div>
                    }
                  >
                    <For each={filteredLikes()}>
                      {(like) => {
                        const draggableInfo = createDraggable(
                          like.track.uri,
                          like.track,
                        );
                        return (
                          <div
                            ref={(element) =>
                              draggableInfo(element, () => ({
                                skipTransform: true,
                              }))
                            }
                            class="group flex cursor-grab touch-none items-center gap-3 border-b border-overlay/30 px-2 py-2.5 transition-colors select-none last:border-0 hover:bg-highlight-low/40 active:cursor-grabbing"
                          >
                            <Artwork
                              class="pointer-events-none size-12 rounded-lg shadow-md"
                              kind="album"
                              src={like.track?.album?.images?.[0]?.url}
                              alt={like.track?.name}
                            />

                            <div class="pointer-events-none flex min-w-0 flex-1 flex-col">
                              <p
                                class="truncate text-sm font-semibold transition-colors"
                                classList={{
                                  "text-text": !pendingRemovals().includes(
                                    like.track?.uri,
                                  ),
                                  "group-hover:text-foam":
                                    !pendingRemovals().includes(
                                      like.track?.uri,
                                    ),
                                  "text-removed": pendingRemovals().includes(
                                    like.track?.uri,
                                  ),
                                }}
                              >
                                {like.track?.name}
                              </p>
                              <p class="truncate text-xs text-subtle">
                                {like.track?.artists
                                  ?.map((artist: any) => artist.name)
                                  .join(", ") || "Unknown Artist"}
                              </p>
                              <Show
                                when={playlistMembership()[like.track?.uri]}
                              >
                                {(names) => (
                                  <div class="mt-1 flex min-w-0 items-center gap-1">
                                    <span class="shrink-0 text-[10px] text-muted">
                                      in
                                    </span>
                                    <For each={names().slice(0, 2)}>
                                      {(name) => (
                                        <span class="truncate rounded-full bg-overlay px-1.5 py-0.5 text-[10px] text-subtle">
                                          {name}
                                        </span>
                                      )}
                                    </For>
                                    <Show when={names().length > 2}>
                                      <span class="shrink-0 rounded-full bg-overlay px-1.5 py-0.5 text-[10px] text-subtle">
                                        +{names().length - 2}
                                      </span>
                                    </Show>
                                  </div>
                                )}
                              </Show>
                            </div>

                            <div class="pointer-events-none hidden max-w-[150px] truncate pr-2 text-xs text-muted lg:block">
                              {like.track?.album?.name}
                            </div>

                            <Show
                              when={pendingRemovals().includes(like.track?.uri)}
                            >
                              <span
                                class="flex shrink-0 items-center pr-1 text-love"
                                title="Removed from Liked Songs when you apply"
                                aria-label="Queued for removal"
                              >
                                <FaIcon icon={faTrash} class="size-4" />
                              </span>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              </section>

              {/* Right Panel: Playlists */}
              <section class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-overlay/40 bg-surface p-5 shadow-xl md:col-span-5 lg:col-span-4">
                <h2 class="mb-4 text-2xl font-bold tracking-tight text-text">
                  Your Playlists
                  <span class="ml-2 align-baseline text-sm font-medium text-pine">
                    {getPlaylists()?.length ?? 0}
                  </span>
                </h2>

                <div class="custom-scrollbar grow overflow-y-auto pr-1">
                  <NewPlaylistRow
                    onActivate={() => {
                      setPendingTrack(null);
                      setModalOpen(true);
                    }}
                  />

                  <Show
                    when={getPlaylists()?.length > 0}
                    fallback={
                      <div class="flex h-full flex-col items-center justify-center gap-1 p-8 text-center text-muted">
                        <p class="text-sm">
                          {rateLimited()
                            ? "Spotify is rate limiting requests. Try again in a few minutes."
                            : "No writable playlists found"}
                        </p>
                        <Show when={!rateLimited()}>
                          <p class="text-xs text-muted">
                            Drop a song on New to make one
                          </p>
                        </Show>
                      </div>
                    }
                  >
                    <For each={getPlaylists()}>
                      {(playlist) => {
                        const droppableInfo = createDroppable(
                          playlist.id,
                          playlist,
                        );
                        const isDraggedOver = () =>
                          droppableInfo.isActiveDroppable;
                        const isAdding = () => addingTrackId() === playlist.id;

                        return (
                          <div
                            ref={droppableInfo}
                            class="relative flex items-center gap-3 border-b border-overlay/30 px-2 py-2.5 transition-colors select-none last:border-0"
                            classList={{
                              "hover:bg-highlight-low/40": !isDraggedOver(),
                              "rounded-lg bg-overlay ring-2 ring-pine ring-inset":
                                isDraggedOver(),
                              "pointer-events-none opacity-60": isAdding(),
                            }}
                          >
                            <Artwork
                              class="pointer-events-none size-12 rounded-lg shadow-sm"
                              kind="playlist"
                              src={playlist.images?.[0]?.url}
                              alt={playlist.name}
                            />
                            <div class="pointer-events-none flex min-w-0 flex-1 flex-col">
                              <p class="truncate text-sm font-semibold text-text">
                                {playlist.name}
                              </p>
                              <p
                                class="text-xs"
                                classList={{
                                  "font-semibold text-pine": isDraggedOver(),
                                  "text-subtle": !isDraggedOver(),
                                }}
                              >
                                {isDraggedOver()
                                  ? "Drop to add it"
                                  : `${playlist.tracks?.total ?? 0} ${playlist.tracks?.total === 1 ? "track" : "tracks"}`}
                              </p>
                            </div>

                            {/* Loading / Success Overlays */}
                            <Show when={isAdding()}>
                              <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/80 backdrop-blur-xs">
                                <div class="size-5 animate-spin rounded-full border-2 border-pine border-t-transparent"></div>
                              </div>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>

                <label class="mt-3 flex cursor-pointer items-center justify-between gap-3 border-t border-overlay/30 pt-3 text-xs text-subtle">
                  <span>Remove from Liked Songs after adding</span>
                  <span
                    class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
                    classList={{
                      "bg-pine": removeAfterAdding(),
                      "bg-highlight-med": !removeAfterAdding(),
                    }}
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      checked={removeAfterAdding()}
                      onChange={(e) =>
                        setRemoveAfterAdding(e.currentTarget.checked)
                      }
                    />
                    <span
                      class="absolute left-0.5 size-4 rounded-full bg-text transition-transform"
                      style={{
                        transform: removeAfterAdding()
                          ? "translateX(16px)"
                          : "translateX(0)",
                      }}
                    />
                  </span>
                </label>
              </section>
            </div>
          </Show>
        </div>

        <Show when={activeDragTrack()}>
          <TrashTarget />
        </Show>

        <Show when={activeDragTrack()} keyed>
          {(track) => (
            <Show when={dragPoint()}>
              {(point) => (
                <div
                  class="pointer-events-none fixed z-50 flex w-56 items-center gap-2 rounded-lg border border-overlay bg-surface p-1.5 opacity-90 shadow-2xl select-none"
                  style={ghostPosition(point())}
                >
                  <Artwork
                    class="size-9 rounded-md"
                    kind="album"
                    src={track.album?.images?.[0]?.url}
                    alt={track.name}
                  />
                  <div class="flex min-w-0 flex-1 flex-col">
                    <p class="truncate text-xs font-semibold text-text">
                      {track.name}
                    </p>
                    <p class="truncate text-[10px] text-subtle">
                      {track.artists
                        ?.map((artist: any) => artist.name)
                        .join(", ") || "Unknown Artist"}
                    </p>
                  </div>
                </div>
              )}
            </Show>
          )}
        </Show>

        <Show when={modalOpen()}>
          <NewPlaylistModal
            track={pendingTrack()}
            onCancel={() => setModalOpen(false)}
            onCreate={async ({ name, description, isPublic }) => {
              const track = pendingTrack();
              await createPlaylist(
                name,
                description,
                isPublic,
                track ? [track.uri] : [],
              );

              if (track && removeAfterAdding()) {
                await removeFromLikedSongs(track.uri);
              }

              setModalOpen(false);
              setPendingTrack(null);
              showToast(`Queued new playlist "${name}"`, "success");
            }}
          />
        </Show>
      </DragDropSensors>
    </DragDropProvider>
  );
};

export default Home;
