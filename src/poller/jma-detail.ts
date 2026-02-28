import { logger } from "../utils/logger.js";

/**
 * Fetch the detail XML for a specific JMA entry.
 * Returns the raw XML string, or null on failure.
 */
export async function fetchDetailXml(
  url: string
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      logger.warn("DETAIL", `Fetch failed for ${url}`, { statusCode: res.status });
      return null;
    }
    return await res.text();
  } catch (err) {
    logger.warn("DETAIL", `Fetch error for ${url}`, { error: err });
    return null;
  }
}
