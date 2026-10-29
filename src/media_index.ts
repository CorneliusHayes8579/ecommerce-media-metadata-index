import { z } from "zod";
import { InfraiMediaClient } from "./infrai_media.ts";

export const checkoutRequest = z.object({
  order_id: z.string().min(1),
  customer_id: z.string().min(1),
  media_bucket: z.string().min(1),
  media_keys: z.array(z.string()).min(1)
});
export type CheckoutRequest = z.infer<typeof checkoutRequest>;

export type OrderUpdate = { order_id: string; state: "paid" | "fulfilled"; receipt: string; customer_message: string };
export type MediaRecord = { key: string; width: number; height: number; format: string };

export async function indexCheckoutMedia(input: unknown, client: InfraiMediaClient): Promise<{ update: OrderUpdate; media: MediaRecord[] }> {
  const request = checkoutRequest.parse(input);
  await client.ensureBucket(request.media_bucket);
  const available = await client.listMedia(request.media_bucket);
  const keys = new Set(available.map((item) => item.key));
  const media: MediaRecord[] = [];
  for (const key of request.media_keys) {
    if (!keys.has(key)) continue;
    const details = await client.metadata(key);
    media.push({ key, ...details });
  }
  return {
    update: {
      order_id: request.order_id,
      state: "fulfilled",
      receipt: `receipt-${request.order_id}`,
      customer_message: `Order ${request.order_id} is fulfilled with ${media.length} indexed media items.`
    },
    media
  };
}

const key = process.env.INFRAI_API_KEY;
if (process.argv[1]?.endsWith("media_index.ts")) {
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");
  const input = { order_id: "order-1042", customer_id: "customer-7", media_bucket: "shop-media", media_keys: ["products/red-shoe.png"] };
  const result = await indexCheckoutMedia(input, new InfraiMediaClient(key));
  console.log(JSON.stringify(result, null, 2));
}
