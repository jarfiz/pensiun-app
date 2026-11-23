const DEFAULT_CLIENT_TTL_MS = 30_000;

interface ClientCacheEntry<T> {
  data: T;
  timestamp: number;
}

const responseCache = new Map<string, ClientCacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export function getCachedJson<T>(
  url: string,
  ttlMs: number = DEFAULT_CLIENT_TTL_MS
): T | null {
  const entry = responseCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    return null;
  }
  return entry.data as T;
}

export async function fetchCachedJson<T>(
  url: string,
  signal?: AbortSignal
): Promise<T> {
  let request = inFlightRequests.get(url) as Promise<T> | undefined;
  if (!request) {
    request = fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          let message = "Gagal memuat data.";
          try {
            const errJson = (await res.json()) as { error?: string };
            if (errJson?.error) message = errJson.error;
          } catch {
            // abaikan parsing error body
          }
          throw new Error(message);
        }
        return res.json() as Promise<T>;
      })
      .then((json) => {
        responseCache.set(url, { data: json, timestamp: Date.now() });
        return json;
      })
      .finally(() => {
        inFlightRequests.delete(url);
      });

    inFlightRequests.set(url, request);
  }

  if (!signal) {
    return request;
  }

  if (signal.aborted) {
    const abortErr = new Error("Aborted");
    abortErr.name = "AbortError";
    return Promise.reject(abortErr);
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const abortErr = new Error("Aborted");
      abortErr.name = "AbortError";
      reject(abortErr);
    };
    signal.addEventListener("abort", onAbort, { once: true });

    request.then(
      (data) => {
        signal.removeEventListener("abort", onAbort);
        resolve(data);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      }
    );
  });
}

export function invalidateClientCache(prefix?: string): void {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
  }
}
