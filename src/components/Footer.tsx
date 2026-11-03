import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "./FaIcon";
import {
  applyChanges,
  discardChanges,
  getLikes,
  getPlaylists,
  pendingChanges,
  undoChange,
} from "../services/api";

export const Footer = () => {
  const [applying, setApplying] = createSignal(false);
  const [status, setStatus] = createSignal<string | null>(null);
  const [open, setOpen] = createSignal(false);

  const applyAll = async () => {
    const count = pendingChanges().length;
    setApplying(true);
    setStatus(null);

    try {
      await applyChanges();
      setOpen(false);
      setStatus(`Applied ${count} change${count === 1 ? "" : "s"}`);
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus(err?.message || "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const undo = (id: number) => {
    undoChange(id);
    if (pendingChanges().length === 0) setOpen(false);
  };

  const discardAll = () => {
    discardChanges();
    setOpen(false);
  };

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

  const songCount = () => getLikes().length;
  const playlistCount = () => getPlaylists().length;

  return (
    <footer class="relative flex h-[52px] shrink-0 items-center justify-between gap-3 border-t border-overlay/60 bg-surface px-4 text-xs text-subtle sm:gap-6 sm:px-6">
      <span class="truncate whitespace-nowrap">
        {songCount()} liked {songCount() === 1 ? "song" : "songs"}
        <span class="hidden sm:inline">
          <span class="mx-1.5 text-muted">·</span>
          {playlistCount()} {playlistCount() === 1 ? "playlist" : "playlists"}
        </span>
      </span>

      <Show
        when={pendingChanges().length > 0}
        fallback={
          <span class="truncate whitespace-nowrap">
            {status() ?? "Nothing pending"}
          </span>
        }
      >
        <Show when={open()}>
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-app-base/70 p-4 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div class="w-full max-w-md rounded-2xl border border-overlay bg-surface p-5 shadow-2xl">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-bold text-text">Pending changes</h2>
                  <p class="mt-0.5 text-xs text-subtle">
                    Nothing is sent to Spotify until you apply.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  class="rounded-full px-2 py-1 text-subtle transition-colors hover:text-text"
                >
                  <FaIcon icon={faXmark} class="size-4" />
                </button>
              </div>

              <ul class="mt-4 flex max-h-80 flex-col gap-1 overflow-y-auto">
                <For each={pendingChanges()}>
                  {(change) => (
                    <li class="flex items-start justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-highlight-low/40">
                      <span class="text-sm/snug text-text">{change.label}</span>
                      <button
                        type="button"
                        onClick={() => undo(change.id)}
                        class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-subtle transition-colors hover:text-love"
                      >
                        Undo
                      </button>
                    </li>
                  )}
                </For>
              </ul>

              <div class="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={discardAll}
                  class="rounded-full px-3 py-1.5 text-xs font-semibold text-subtle transition-colors hover:text-love"
                >
                  Discard all
                </button>
                <button
                  type="button"
                  onClick={applyAll}
                  disabled={applying()}
                  class="rounded-full bg-pine px-4 py-1.5 text-xs font-semibold text-highlight-low transition-colors hover:bg-foam disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying() ? "Applying..." : "Apply changes"}
                </button>
              </div>
            </div>
          </div>
        </Show>

        <div class="-mr-2.5 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(!open())}
            class="mr-1 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap text-text transition-colors hover:bg-highlight-low/40 sm:mr-2"
          >
            {pendingChanges().length} pending
          </button>
          <button
            type="button"
            onClick={discardAll}
            class="rounded-full px-2.5 py-1 font-semibold whitespace-nowrap transition-colors hover:text-love"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={applyAll}
            disabled={applying()}
            class="rounded-full bg-pine px-2.5 py-1 font-semibold whitespace-nowrap text-highlight-low transition-colors hover:bg-foam disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying() ? (
              "Applying..."
            ) : (
              <>
                <span class="sm:hidden">Apply</span>
                <span class="hidden sm:inline">Apply changes</span>
              </>
            )}
          </button>
        </div>
      </Show>
    </footer>
  );
};

export default Footer;
