import { Show } from "solid-js";
import Button from "./Button";
import { logoutClick, authState } from "../services/auth";
import { getUserDisplayName, getUserProfileImage } from "../services/api";
import { searchQuery, setSearchQuery } from "../services/search";

const SearchBox = () => (
  <input
    type="search"
    placeholder="Search liked songs..."
    value={searchQuery()}
    onInput={(event) => setSearchQuery(event.currentTarget.value)}
    class="w-full rounded-lg border border-highlight-med bg-overlay px-3 py-1.5 text-sm text-text placeholder-muted transition-colors focus:border-pine focus:outline-none"
  />
);

export const Header = () => {
  return (
    <Show when={authState.isLoggedIn()}>
      <header class="sticky top-0 z-40 w-full border-b border-overlay/40 bg-surface/80 px-6 py-3 shadow-sm backdrop-blur-md">
        <div class="flex items-center justify-between gap-6">
          <span class="shrink-0 text-base font-bold tracking-tight text-text">
            Holt
          </span>

          <div class="hidden max-w-md flex-1 md:flex">
            <SearchBox />
          </div>

          <div class="flex shrink-0 items-center gap-4">
            <div class="flex items-center gap-3 rounded-full border border-highlight-med/30 bg-overlay/50 px-3 py-1">
              <Show
                when={getUserProfileImage()}
                fallback={
                  <div class="flex size-7 items-center justify-center rounded-full bg-highlight-high text-xs font-bold text-subtle">
                    {getUserDisplayName()?.charAt(0) || "U"}
                  </div>
                }
              >
                <img
                  src={getUserProfileImage()}
                  alt="Profile"
                  class="size-7 rounded-full border border-highlight-med object-cover shadow-inner"
                />
              </Show>
              <span class="hidden pr-1 text-sm font-semibold text-text sm:inline-block">
                {getUserDisplayName() || "Guest"}
              </span>
            </div>

            <Button
              text="Logout"
              onClick={logoutClick}
              visible={authState.isLoggedIn()}
            />
          </div>
        </div>

        <div class="mt-3 md:hidden">
          <SearchBox />
        </div>
      </header>
    </Show>
  );
};

export default Header;
