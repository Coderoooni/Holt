import { Show } from "solid-js";
import { faListUl, faMusic } from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "./FaIcon";

export const Artwork = (props: {
  src?: string;
  alt: string;
  kind: "album" | "playlist";
  class?: string;
}) => (
  <Show
    when={props.src}
    fallback={
      <div
        class={`flex shrink-0 items-center justify-center rounded-lg bg-overlay text-muted ${props.class ?? ""}`}
      >
        <FaIcon
          icon={props.kind === "album" ? faMusic : faListUl}
          class="size-5"
        />
      </div>
    }
  >
    <img
      class={`shrink-0 object-cover ${props.class ?? ""}`}
      src={props.src}
      alt={props.alt}
      loading="lazy"
    />
  </Show>
);

export default Artwork;
