/**
 * Returns the root directory for thesis file uploads.
 *
 * On Railway (or any platform with a persistent volume), set UPLOAD_DIR
 * to the mounted volume path — e.g. `/app/data/uploads`. Without this,
 * uploads land in the container's ephemeral filesystem and vanish on
 * every redeploy.
 *
 * Falls back to `<cwd>/uploads` for local development.
 */

import path from 'path'

export function getUploadsRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')
}

/** Returns the uploads directory for a specific match. */
export function getMatchUploadsDir(matchId: string): string {
  return path.join(getUploadsRoot(), matchId)
}
