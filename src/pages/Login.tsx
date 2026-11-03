import { loginWithSpotifyClick, authState } from "../services/auth";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { FaIcon } from "../components/FaIcon";

export const Login = () => {
  return (
    <section class="flex flex-col items-center justify-center p-6 text-center">
      <div class="group relative w-full max-w-md overflow-hidden rounded-2xl border border-overlay/50 bg-surface p-8 shadow-2xl">
        <div class="absolute -top-10 -right-10 size-32 rounded-full bg-pine/10 blur-2xl transition-all duration-500 group-hover:bg-pine/20"></div>
        <div class="absolute -bottom-10 -left-10 size-32 rounded-full bg-iris/10 blur-2xl transition-all duration-500 group-hover:bg-iris/20"></div>

        <div class="relative flex flex-col items-center gap-6">
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-black tracking-tight text-text">Holt</h1>
            <p class="px-4 text-sm text-subtle">
              Quickly sort liked songs into your existing playlists. Or don't.
            </p>
          </div>

          <div class="flex w-full flex-col items-center gap-3">
            <button
              onClick={() => loginWithSpotifyClick()}
              class="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-pine px-6 py-3 text-base font-semibold text-highlight-low shadow-md transition-all duration-200 hover:scale-105 hover:bg-foam active:scale-95"
            >
              <FaIcon icon={faSpotify} class="size-5 shrink-0" />
              <span>Login with Spotify</span>
            </button>

            <button
              onClick={() => {
                authState.setToken("mock_token");
                window.location.href = "/";
              }}
              class="mt-1 cursor-pointer text-xs text-subtle underline hover:text-foam"
            >
              Try Demo Mode
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
