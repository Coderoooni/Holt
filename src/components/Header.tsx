import { Show } from "solid-js";
import Button from "./Button";
import { logoutClick, authState } from "../services/auth";
import { getUserDisplayName, getUserProfileImage } from "../services/api";

export const Header = () => {
  return (
    <Show when={authState.isLoggedIn()}>
      <header class="sticky top-0 z-40 w-full border-b border-overlay/40 bg-surface/80 backdrop-blur-md px-6 py-4 shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex flex-col">
            <span class="text-base font-bold text-text tracking-tight">
              Holt
            </span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3 rounded-full bg-overlay/50 border border-highlight-med/30 px-3 py-1">
            <Show
              when={getUserProfileImage()}
              fallback={
                <div class="h-7 w-7 rounded-full bg-highlight-high flex items-center justify-center text-xs font-bold text-subtle">
                  {getUserDisplayName()?.charAt(0) || "U"}
                </div>
              }
            >
              <img
                src={getUserProfileImage()}
                alt="Profile"
                class="h-7 w-7 rounded-full object-cover border border-highlight-med shadow-inner"
              />
            </Show>
            <span class="text-sm font-semibold text-text hidden sm:inline-block pr-1">
              {getUserDisplayName() || "Guest"}
            </span>
          </div>

          <Button
            text="Logout"
            onClick={logoutClick}
            visible={authState.isLoggedIn()}
          />
        </div>
      </header>
    </Show>
  );
};

export default Header;
