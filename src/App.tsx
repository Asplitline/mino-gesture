import { useCallback, useEffect, useState } from "react";
import { HomeView } from "./components/HomeView";
import { GesturePanel } from "./components/GesturePanel";
import { readRouteState } from "./lib/appRoute";

export function App() {
  const [routeState, setRouteState] = useState(readRouteState);
  const route = routeState.route;

  const handleIntentHandled = useCallback(() => {
    window.history.replaceState({}, "", "/panel");
    setRouteState(readRouteState());
  }, []);

  useEffect(() => {
    const onPopState = () => setRouteState(readRouteState());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (route === "home") {
    return (
      <HomeView
        onOpenPanel={() => {
          window.history.pushState({}, "", "/panel");
          setRouteState(readRouteState());
        }}
        onOpenPanelCreate={() => {
          window.history.pushState({}, "", "/panel?intent=create");
          setRouteState(readRouteState());
        }}
      />
    );
  }

  return <GesturePanel routeSearch={routeState.search} onIntentHandled={handleIntentHandled} />;
}
