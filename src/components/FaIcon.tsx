import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Renders Font Awesome path data directly; the core renderer costs ~23 kB gzipped for two icons.
export const FaIcon = (props: { icon: IconDefinition; class?: string }) => {
  const [width, height, , , path] = props.icon.icon;

  return (
    <svg
      class={props.class}
      viewBox={`0 0 ${width} ${height}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={path as string} />
    </svg>
  );
};

export default FaIcon;
