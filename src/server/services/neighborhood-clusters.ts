/**
 * Houston neighborhood geographic clusters
 * Activities within the same cluster are close to each other
 */
export const neighborhoodClusters = {
  // Inner Loop West - Artsy/Hip area
  'inner-west': ['Montrose', 'Museum District', 'Rice Village', 'Upper Kirby'],

  // Inner Loop East - Urban core
  'inner-east': ['Midtown', 'Downtown', 'EaDo'],

  // Heights/Washington area - North
  'north': ['Heights', 'Washington Avenue'],

  // Uptown/West - Upscale
  'uptown': ['Galleria', 'Memorial Park'],

  // International/West - Far west
  'far-west': ['Chinatown'],

  // South - Far south
  'south': ['Clear Lake'],
};

/**
 * Get cluster for a neighborhood
 */
export function getNeighborhoodCluster(neighborhood: string): string | null {
  for (const [cluster, neighborhoods] of Object.entries(neighborhoodClusters)) {
    if (neighborhoods.includes(neighborhood)) {
      return cluster;
    }
  }
  return null;
}

/**
 * Check if two neighborhoods are in the same or adjacent clusters
 */
export function areNeighborhoodsClose(n1: string, n2: string): boolean {
  const cluster1 = getNeighborhoodCluster(n1);
  const cluster2 = getNeighborhoodCluster(n2);

  if (!cluster1 || !cluster2) return false;
  if (cluster1 === cluster2) return true;

  // Define adjacent clusters
  const adjacentClusters: Record<string, string[]> = {
    'inner-west': ['inner-east', 'uptown'],
    'inner-east': ['inner-west', 'north'],
    'north': ['inner-east', 'inner-west'],
    'uptown': ['inner-west'],
    'far-west': [], // Isolated
    'south': [], // Isolated
  };

  return adjacentClusters[cluster1]?.includes(cluster2) || false;
}

/**
 * Get distance penalty for neighborhoods
 * 0 = same cluster, higher = farther apart
 */
export function getNeighborhoodDistance(n1: string, n2: string): number {
  if (n1 === n2) return 0;
  if (areNeighborhoodsClose(n1, n2)) return 1;
  return 3; // Far apart
}
