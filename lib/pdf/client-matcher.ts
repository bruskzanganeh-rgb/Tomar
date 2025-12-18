import { distance } from 'fastest-levenshtein'

interface Client {
  id: string
  name: string
}

/**
 * Match a client name from an invoice to existing clients in the database
 * Uses fuzzy string matching with Levenshtein distance
 */
export function matchClient(
  clientName: string,
  clients: Client[]
): Client | null {
  if (!clientName || clients.length === 0) {
    return null
  }

  // Normalize the input client name
  const normalizedInput = normalizeString(clientName)

  let bestMatch: Client | null = null
  let bestDistance = Infinity

  for (const client of clients) {
    const normalizedClientName = normalizeString(client.name)

    // Calculate Levenshtein distance
    const dist = distance(normalizedInput, normalizedClientName)

    // Update best match if this is closer
    if (dist < bestDistance) {
      bestDistance = dist
      bestMatch = client
    }
  }

  // Only return a match if the distance is reasonable
  // Allow up to 30% difference in string length
  const maxAllowedDistance = Math.ceil(normalizedInput.length * 0.3)

  if (bestMatch && bestDistance <= maxAllowedDistance) {
    return bestMatch
  }

  return null
}

/**
 * Normalize a string for comparison
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove common company suffixes
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+ab$/i, '') // Remove "AB" suffix
    .replace(/\s+aktiebolag$/i, '') // Remove "Aktiebolag" suffix
    .replace(/\s+hb$/i, '') // Remove "HB" suffix
    .replace(/\s+kb$/i, '') // Remove "KB" suffix
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}
