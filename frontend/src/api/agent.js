/**
 * Agent activity API client.
 * @module api/agent
 */

import { client } from "./client";

/**
 * @param {{ limit?: number, applicationId?: string }} [opts]
 * @returns {Promise<Array<object>>}
 */
export async function fetchAgentActivity({ limit = 20, applicationId } = {}) {
  const params = { limit };
  if (applicationId) params.application_id = applicationId;
  return client.get("/agent/activity", { params });
}
