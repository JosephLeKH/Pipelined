/** User preferences API — appearance and pipeline stage colors. No React imports. */

import { client } from "./client";

export async function getAppearancePrefs() {
  const response = await client.get("/auth/me");
  return response.appearance_prefs || null;
}

export async function updateAppearancePrefs(prefs) {
  const response = await client.patch("/auth/me/appearance", prefs);
  return response.appearance_prefs || null;
}

export async function getStageColors() {
  const response = await client.get("/auth/me");
  return response.pipeline_stage_colors || null;
}

export async function updateStageColors(colors) {
  const response = await client.patch("/auth/me/stage-colors", colors);
  return response.pipeline_stage_colors || null;
}
