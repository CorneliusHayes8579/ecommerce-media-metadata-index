import assert from "node:assert/strict";
import { indexCheckoutMedia } from "./media_index.ts";

const calls: Array<{ path: string; body?: unknown }> = [];
const client = {
  ensureBucket: async (name: string) => { calls.push({ path: "bucket", body: { name } }); },
  listMedia: async () => [{ key: "shoe-final.jpg" }],
  metadata: async (image: string) => {
    calls.push({ path: "/image/metadata", body: { image } });
    return { width: 1200, height: 800, format: "jpeg" };
  }
} as never;

const result = await indexCheckoutMedia({ order_id: "o-1", customer_id: "c-1", media_bucket: "shop-media", media_keys: ["shoe-final.jpg", "shoe-final.png"] }, client);
assert.deepEqual(result.media, [{ key: "shoe-final.jpg", width: 1200, height: 800, format: "jpeg" }]);
assert.equal(result.update.state, "fulfilled");
assert.equal(calls[1].body && (calls[1].body as { image: string }).image, "shoe-final.jpg");
console.log("media metadata decision test passed");
