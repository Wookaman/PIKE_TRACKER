import { mapOffProduct, OffFood } from '../lib/off';

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const TIMEOUT_MS = 8000;

/** Search Open Food Facts. Throws on network failure/timeout. */
export async function searchOff(query: string): Promise<OffFood[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields: 'product_name,brands,code,nutriments',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`OFF search failed: ${res.status}`);
    const json = (await res.json()) as { products?: unknown[] };
    return (json.products ?? [])
      .map(mapOffProduct)
      .filter((f): f is OffFood => f !== null);
  } finally {
    clearTimeout(timer);
  }
}

/** Look up a single product by barcode. null when OFF has no usable product. */
export async function fetchOffByBarcode(barcode: string): Promise<OffFood | null> {
  const url = `${PRODUCT_URL}/${encodeURIComponent(barcode)}.json?fields=product_name,brands,code,nutriments`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`OFF product failed: ${res.status}`);
    const json = (await res.json()) as { status?: number; product?: unknown };
    if (json.status !== 1) return null;
    return mapOffProduct(json.product);
  } finally {
    clearTimeout(timer);
  }
}
