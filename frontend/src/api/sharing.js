/** Axios wrappers for sharing endpoints. */

import { client } from "./client";

export async function getMyShare() {
  const result = await client.get("/sharing/my");
  // Interceptor returns body.data ?? body. When data === null, null ?? body = body,
  // so we receive { data: null }. Check for a slug to distinguish a share from null.
  if (result && result.slug) return result;
  if (result && result.data === null) return null;
  return result ?? null;
}

export async function createShare() {
  return client.post("/sharing/create");
}

export async function revokeShare() {
  return client.delete("/sharing/revoke");
}

export async function getPublicPipeline(slug) {
  return client.get(`/public/${slug}`);
}

export async function getMyTimelineShare() {
  const result = await client.get("/sharing/timeline");
  if (result && result.slug) return result;
  if (result && result.data === null) return null;
  return result ?? null;
}

export async function createTimelineShare() {
  return client.post("/sharing/timeline");
}

export async function revokeTimelineShare() {
  return client.delete("/sharing/timeline");
}

export async function getPublicTimeline(slug) {
  return client.get(`/public/timeline/${slug}`);
}
