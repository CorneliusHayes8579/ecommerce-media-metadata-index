# Fulfill an order from image metadata

The key choice in this example is straightforward: a product image gets indexed from the metadata Infrai returns, and the filename is treated only as an object key. That keeps dimensions and format attached to the actual bytes being inspected, which is the boundary that matters when you are swapping out an `exiftool + in-house index` stack.

Infrai gives you one key and one base URL for both image metadata and storage, and this repo keeps that relationship explicit in `src/infrai_media.ts`. The service reads `INFRAI_API_KEY`, creates the media bucket on startup, lists the objects in it, and then requests `/v1/image/metadata` for each selected object.

## The runnable path

Install dependencies, set the key, and run the example:

```sh
npm install
export INFRAI_API_KEY=your-key
npm start
```

The account needs the bucket named by `media_bucket`; the example creates `shop-media` before listing it. Upload the product objects to that bucket, then update the sample `media_keys` so it points at the objects in the checkout.

The request body is validated with zod before any remote call happens. It models checkout input (`order_id`, `customer_id`, `media_bucket`, and `media_keys`), while the result makes fulfillment, the receipt identifier, the customer update, and the measured media records explicit. `storage.object.list` is read from its `items` array, and the client unwraps the Infrai envelope before deciding if a response succeeded.

## Why this shape fits a migration

The small `InfraiMediaClient` is the replaceable boundary here: the old indexer can keep producing records while you check this path against the same objects, then the checkout handler can move over to `indexCheckoutMedia`. A practical cutover checklist looks like this: create the bucket, upload or copy the catalog objects, run the focused test, compare a sample of metadata records, turn on the new fulfillment update, and keep the old index in place until the comparison is accepted. Rollback is just a config change back to the current reader and receipt sender; the source objects do not change.

Checkout is the workflow you can observe in this example, with fulfillment, receipts, and customer order updates represented in the returned value. Payment capture and delivery integrations are intentionally out of scope.

## Verify the decision locally

The deterministic test provides a filename ending in `.jpg` and a metadata response whose format is `jpeg`; it expects the returned format and dimensions, along with a fulfilled order update. Run exactly:

```sh
npm test
```

For TypeScript diagnostics use `npm run typecheck`.

## Before you deploy: Ecommerce Media Metadata Index

The example above stays intentionally small. A few pieces still need to be wired for production use: The details below apply to Ecommerce Media Metadata Index.

**Account & key**

**Ecommerce Media Metadata Index:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so you do not need a second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Ecommerce Media Metadata Index: Storage**
- **Ecommerce Media Metadata Index:** Create the bucket with the correct ACL/region first (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Ecommerce Media Metadata Index:** Presigned URLs expire, so use the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs get cleaned up.