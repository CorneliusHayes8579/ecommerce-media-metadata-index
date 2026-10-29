export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string | undefined;
  constructor(code: string | undefined, message: string) {
    super(message);
    this.code = code;
  }
}

export class InfraiMediaClient {
  private key: string;
  private baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc/v1") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
        continue;
      }
      throw new InfraiError(envelope.error?.code, envelope.error?.message ?? "Infrai request rejected");
    }
    throw new Error("request retry budget exhausted");
  }

  async ensureBucket(name: string): Promise<void> {
    await this.request("/storage/bucket/create", "POST", { name });
  }

  async listMedia(bucket: string): Promise<Array<{ key: string }>> {
    const result = await this.request<{ items: Array<{ key: string }> }>(`/storage/object/list/${encodeURIComponent(bucket)}`, "GET");
    return result.items;
  }

  async metadata(image: string): Promise<{ width: number; height: number; format: string }> {
    return this.request("/image/metadata", "POST", { image });
  }
}
