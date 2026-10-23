import { index, type RouteConfig, route } from "@react-router/dev/routes";
import { pageRoutes } from "./pages";

export default [
  ...pageRoutes.map(({ path, file }) => (path === "/" ? index(file) : route(path.slice(1), file))),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
