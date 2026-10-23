import { data } from "react-router";
import type { Route } from "./+types/not-found";

/** Any unknown path: a 404 that the root ErrorBoundary renders as "Off the map". */
export function loader({ url }: Route.LoaderArgs) {
  throw data(url.pathname, 404);
}

export default function NotFound() {
  return null;
}
