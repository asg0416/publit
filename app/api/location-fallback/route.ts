import { parseIpLocationHeaders } from '@/lib/location/ipLocationFallback';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return Response.json(parseIpLocationHeaders(request.headers), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
