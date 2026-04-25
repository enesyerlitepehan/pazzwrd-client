DEK Wrapped Versioning API (Backend Contract)

Overview

- Tracks a monotonically increasing `wrapGeneration` for the user’s wrapped DEK.
- Allows clients to detect MP changes across devices and react accordingly.

Endpoints

1. GET /v1/keys/wrapped-dek
   Response 200 JSON:
   {
   "wrapGeneration": number, // required, monotonically increasing
   "dekWrappedByMP": { "nonce": string, "ct": string },
   "saltMP": string, // base64url
   "kdfParams": { "iterations": number, "dkLen": number, "kdfVersion": number },
   "updatedAt": string, // optional ISO timestamp
   "bindingTag": string // optional integrity tag (opaque to server)
   }
   - Server should also return `ETag` = hash of (wrapGeneration) or (nonce||ct) for cache.

2. PUT /v1/keys/wrapped-dek
   Request JSON:
   {
   "prevGeneration": number, // optional optimistic concurrency control
   "DEK_wrapped_by_MP": { "nonce": string, "ct": string },
   "kdfVersion": number,
   "bindingTag": string // optional, if client provides
   }

   Behavior:
   - If prevGeneration is provided and does not match current, return 409 CONFLICT.
   - Otherwise, store wrapped material and atomically increment `wrapGeneration`.
   - Response 200 JSON should include the new `wrapGeneration` and the stored fields:
     {
     "wrapGeneration": number,
     "dekWrappedByMP": { "nonce": string, "ct": string },
     "saltMP": string,
     "kdfParams": { "iterations": number, "dkLen": number, "kdfVersion": number },
     "updatedAt": string,
     "bindingTag": string
     }

Notes

- For backward compatibility, any existing bootstrap endpoint may continue to accept the same wrapped payload and return the new shape above.
- `bindingTag` (optional) can be a client-produced HMAC over (wrapGeneration || saltMP || kdfParams) using DEK to allow devices with local DEK to verify integrity without MP.
