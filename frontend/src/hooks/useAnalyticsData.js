/** Hook that aggregates all analytics data queries. */

import { useAnalytics, useApplicationStats, useFunnel } from "./useApplications";

const EMPTY_STATE_THRESHOLD = 3;

/**
 * Returns aggregated analytics data and loading state.
 * @param {number|null} days
 */
function useAnalyticsData(days) {
  const { data: analytics, isLoading, error, refetch } = useAnalytics(days);
  const { data: funnelData = [] } = useFunnel();
  const { data: stats } = useApplicationStats();
  const tagOfferRates = stats?.tag_offer_rates ?? [];

  const totalApps = analytics
    ? analytics.stage_funnel.reduce((sum, s) => sum + s.count, 0)
    : 0;

  const hasEnoughData = totalApps >= EMPTY_STATE_THRESHOLD;

  return { analytics, funnelData, tagOfferRates, stats, totalApps, hasEnoughData, isLoading, error, refetch };
}

export default useAnalyticsData;
