import Header from "./components/Header";

import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Callback from "./pages/Callback";

import { Router, Route } from "@solidjs/router";
import { Login } from "./pages/Login";
import { onMount } from "solid-js";

export const App = () => {
  onMount(() => {
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    if (redirectUri) {
      try {
        const redirectOrigin = new URL(redirectUri).origin;
        if (window.location.origin !== redirectOrigin) {
          window.location.href = redirectOrigin + window.location.pathname + window.location.search;
          return;
        }
      } catch (e) {
        console.error("Invalid VITE_SPOTIFY_REDIRECT_URI:", e);
      }
    }

  });
    
  return (
    <>
      <Header />

      <main class="flex h-full grow items-center justify-evenly">
        <Router>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/callback" component={Callback} />
          <Route path="*" component={NotFound} />
        </Router>
      </main>
    </>
  );
};

export default App;
