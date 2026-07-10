import { normalizeContentLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function getCountryCode(request: Request) {
  const vercelCountry = request.headers.get('x-vercel-ip-country')?.trim().toUpperCase();
  if (vercelCountry && /^[A-Z]{2}$/.test(vercelCountry)) return vercelCountry;
  const language = request.headers.get('accept-language')?.split(',')[0]?.trim() ?? '';
  const region = language.split('-')[1]?.toUpperCase();
  return region && /^[A-Z]{2}$/.test(region) ? region : null;
}

export function GET(request: Request) {
  return Response.json({
    locale: normalizeContentLocale(request.headers.get('accept-language')),
    countryCode: getCountryCode(request),
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Accept-Language, X-Vercel-IP-Country',
    },
  });
}
