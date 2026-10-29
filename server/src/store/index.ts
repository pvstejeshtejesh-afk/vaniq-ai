import { env } from '../config.js';
import { MemoryStore } from './memory.js';
import type { Store } from './store.js';

export type { Store } from './store.js';
export { MemoryStore } from './memory.js';

/**
 * Create the configured Store. `memory` (default) is a zero-dependency
 * in-process store used for dev/demo/tests. `mongo` uses Mongoose and is
 * selected with STORAGE=mongo + MONGODB_URI.
 *
 * To keep the default path dependency-free and reliable, the Mongo adapter is
 * loaded lazily and only when explicitly selected.
 */
export async function createStore(): Promise<Store> {
  const cfg = env();
  if (cfg.STORAGE === 'mongo') {
    if (!cfg.MONGODB_URI) throw new Error('STORAGE=mongo requires MONGODB_URI');
    const { MongoStore } = await import('./mongo.js');
    return MongoStore.connect(cfg.MONGODB_URI);
  }
  return new MemoryStore();
}
