import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Callback from "./pages/Callback";

import { Router, Route, useLocation } from "@solidjs/router";
import { Login } from "./pages/Login";
import { Show, onMount } from "solid-js";
import type { JSX } from "solid-js";

const Shell = (props: { children?: JSX.Element }) => {
  const location = useLocation();

  onMount(() => {
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    if (!redirectUri) return;

    try {
      const redirectOrigin = new URL(redirectUri).origin;
      if (window.location.origin !== redirectOrigin) {
        window.location.href =
          redirectOrigin + window.location.pathname + window.location.search;
      }
    } catch (e) {
      console.error("Invalid VITE_SPOTIFY_REDIRECT_URI:", e);
    }
  });

  return (
    <>
      <Header />

      <main class="flex min-h-0 grow items-center justify-evenly">
        {props.children}
      </main>

      <Show when={location.pathname === "/"}>
        <Footer />
      </Show>
    </>
  );
};

export const App = () => (
  <Router root={Shell}>
    <Route path="/" component={Home} />
    <Route path="/login" component={Login} />
    <Route path="/callback" component={Callback} />
    <Route path="*" component={NotFound} />
  </Router>
);

export default App;
