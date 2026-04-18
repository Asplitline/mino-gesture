import type { ViewRoute } from "../types/app";

export function readRouteState(): { route: ViewRoute; search: string } {
  if (typeof window === "undefined") return { route: "home", search: "" };
  return {
    route: window.location.pathname === "/panel" ? "panel" : "home",
    search: window.location.search,
  };
}
