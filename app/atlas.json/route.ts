import { kinds, regions } from "@/lib/atlas";

export const dynamic = "force-static";

export function GET() {
  return Response.json({ kinds, regions });
}
