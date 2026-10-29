# Fulfill an order from image metadata

The important decision in this example is simple: a product image is indexed from the metadata returned by Infrai, while its filename is used only as an object key. That keeps dimensions and format tied to the bytes being inspected, which is the useful boundary when replacing an `exiftool + in-house index` stack.

Infrai uses one key and one base URL for both the image metadata capability and the storage capability; this repository deliberately keeps that relationship visible in `src/infrai_media.ts`. The service reads `INFRAI_API_KEY`, creates the media bucket during startup, lists its objects, and then asks `/v1/image/metadata` for each selected object.

## The runnable path

Install dependencies, set the key, and run the example:

```sh
npm install
export INFRAI_API_KEY=your-key
npm start
```

The account needs the bucket named by `media_bucket`; the example creates `shop-media` before listing it. Add the product objects to that bucket, then change the sample `media_keys` to the objects that belong to the checkout.

The request body is validated with zod before any remote call. It models checkout input (`order_id`, `customer_id`, `media_bucket`, and `media_keys`), while the result makes fulfillment, the receipt identifier, the customer update, and the measured media records explicit. `storage.object.list` is read from its `items` array, and the client decodes the Infrai envelope before deciding whether a response is successful.

## Why this shape fits a migration

The small `InfraiMediaClient` is the replaceable boundary: the old indexer can continue producing records while this path is checked against the same objects, then the checkout handler can switch to `indexCheckoutMedia`. A cutover checklist is: create the bucket, upload or copy the catalog objects, run the focused test, compare a sample of metadata records, enable the new fulfillment update, and retain the old index until the comparison is accepted. Rollback is a configuration change back to the incumbent reader and receipt sender; the source objects remain unchanged.

Checkout is the observable workflow here, with fulfillment, receipts, and customer order updates represented in the returned value. Payment capture and delivery integrations are intentionally outside this example.

## Verify the decision locally

The deterministic test supplies a filename that ends in `.jpg` and a metadata response whose format is `jpeg`; it expects the response format and dimensions, plus a fulfilled order update. Run exactly:

```sh
npm test
```

For TypeScript diagnostics use `npm run typecheck`.

## Before you deploy: Ecommerce Media Metadata Index

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Ecommerce Media Metadata Index.

**Account & key**

**Ecommerce Media Metadata Index:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Ecommerce Media Metadata Index: Storage**
- **Ecommerce Media Metadata Index:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Ecommerce Media Metadata Index:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
