import { createSignal, onMount, onCleanup, Show } from "solid-js";

export const NewPlaylistModal = (props: {
  track?: { name: string } | null;
  onCancel: () => void;
  onCreate: (values: {
    name: string;
    description: string;
    isPublic: boolean;
  }) => Promise<void>;
}) => {
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [isPublic, setIsPublic] = createSignal(true);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let input!: HTMLInputElement;

  onMount(() => {
    input.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onCancel();
    };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!name().trim() || busy()) return;

    setBusy(true);
    setError(null);

    try {
      await props.onCreate({
        name: name().trim(),
        description: description().trim(),
        isPublic: isPublic(),
      });
    } catch (err: any) {
      setError(err?.message || "Could not create the playlist");
      setBusy(false);
    }
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-app-base/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onCancel();
      }}
    >
      <form
        onSubmit={submit}
        class="w-full max-w-md rounded-2xl border border-overlay bg-surface p-6 shadow-2xl"
      >
        <h2 class="text-xl font-bold text-text">New playlist</h2>
        <p class="mt-1 text-xs text-subtle">
          <Show
            when={props.track}
            fallback="Creates an empty playlist you can fill later."
          >
            {(track) => `Starts with "${track().name}".`}
          </Show>
        </p>

        <div class="mt-5 flex flex-col gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-subtle">Name</span>
            <input
              ref={input}
              type="text"
              required
              maxLength={100}
              value={name()}
              onInput={(event) => setName(event.currentTarget.value)}
              class="rounded-lg border border-highlight-med bg-overlay px-3 py-2 text-sm text-text placeholder-muted focus:border-pine focus:outline-none"
              placeholder="Late night drive"
            />
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-subtle">Description</span>
            <textarea
              rows={2}
              maxLength={300}
              value={description()}
              onInput={(event) => setDescription(event.currentTarget.value)}
              class="resize-none rounded-lg border border-highlight-med bg-overlay px-3 py-2 text-sm text-text placeholder-muted focus:border-pine focus:outline-none"
              placeholder="Optional"
            />
          </label>

          <label class="flex cursor-pointer items-center gap-2 text-sm text-subtle">
            <input
              type="checkbox"
              checked={isPublic()}
              onChange={(event) => setIsPublic(event.currentTarget.checked)}
              class="size-4 accent-pine"
            />
            Public playlist
          </label>
        </div>

        <Show when={error()}>
          <p class="mt-4 text-xs text-love">{error()}</p>
        </Show>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={props.onCancel}
            class="rounded-full px-4 py-2 text-sm font-semibold text-subtle hover:text-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy() || !name().trim()}
            class="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-highlight-low shadow-md transition-all hover:bg-foam disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy() ? "Creating..." : "Create playlist"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPlaylistModal;
