/** Build the same-origin proxy URL for a Google Places photo reference. */
export function photoUrl(name: string, width = 800) {
  return `/api/photo?name=${encodeURIComponent(name)}&w=${width}`;
}
