import type { ContentLocale } from './publit.ts';

const TRANSLATION_TIMEOUT_MS = 1_500;

function cleanTranslation(value: unknown) {
  const text = String(value ?? '').trim().replace(/<[^>]+>/g, '');
  return text.slice(0, 80);
}

export async function translateText(text: string, source: ContentLocale, target: ContentLocale): Promise<string | null> {
  if (!text.trim() || source === target) return text;

  const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);
  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: { translations?: Array<{ translatedText?: string }> } };
    const translated = cleanTranslation(payload.data?.translations?.[0]?.translatedText);
    return translated || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
