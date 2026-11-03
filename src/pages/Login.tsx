import { loginWithSpotifyClick, authState } from "../services/auth";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { FaIcon } from "../components/FaIcon";

export const Login = () => {
  return (
    <section class="flex flex-col items-center justify-center p-6 text-center">
      <div class="w-full max-w-md rounded-2xl bg-surface border border-overlay/50 p-8 shadow-2xl relative overflow-hidden group">
        <div class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-pine/10 blur-2xl transition-all duration-500 group-hover:bg-pine/20"></div>
        <div class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-iris/10 blur-2xl transition-all duration-500 group-hover:bg-iris/20"></div>

        <div class="relative flex flex-col items-center gap-6">
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-black tracking-tight text-text">
              Holt
            </h1>
            <p class="text-sm text-subtle px-4">
              Quickly sort liked songs into your existing playlists. Or don't.
            </p>
          </div>

          <div class="w-full flex flex-col items-center gap-3">
            <button
              onClick={() => loginWithSpotifyClick()}
              class="flex items-center gap-3 rounded-full bg-pine px-6 py-3 font-semibold text-base text-highlight-low shadow-md hover:bg-foam hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer w-full justify-center"
            >
              <FaIcon icon={faSpotify} class="h-5 w-5 shrink-0" />
              <span>Login with Spotify</span>
            </button>

            <button
              onClick={() => {
                authState.setToken("mock_token");
                window.location.href = "/";
              }}
              class="text-xs text-subtle hover:text-foam underline cursor-pointer mt-1"
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
