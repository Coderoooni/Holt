import { Show } from "solid-js";

export const Button = (props: {
  text: string;
  visible: boolean;
  onClick: () => void;
}) => {
  return (
    <Show when={props.visible}>
      <button
        onClick={props.onClick}
        class="cursor-pointer rounded-full border border-love/30 bg-love/10 px-4 py-1.5 text-center text-sm font-semibold text-love shadow-sm shadow-love/5 transition-all duration-200 hover:bg-love hover:text-highlight-low active:scale-95"
      >
        {props.text}
      </button>
    </Show>
  );
};

export default Button;
