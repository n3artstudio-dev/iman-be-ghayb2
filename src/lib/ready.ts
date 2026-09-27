import { ensureSchema } from "./ensure-db";
import { ensureAdminAndCms, getBotId, seedVideos } from "./seed";

let readyPromise: Promise<void> | null = null;

/** Runs once per server instance: schema bootstrap + companion bot + admin + CMS seed content. */
export function ready(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await ensureSchema();
      await getBotId();
      await seedVideos();
      await ensureAdminAndCms();
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}
