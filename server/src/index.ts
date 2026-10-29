import { createApp } from './app.js';
import { env } from './config.js';
import { createStore } from './store/index.js';

async function main() {
  const store = await createStore();
  const app = createApp(store);
  const port = env().PORT;
  app.listen(port, () => {
    console.log(`Vaniq API listening on http://localhost:${port} (storage=${env().STORAGE})`);
    if (!env().OUTBOUND_CALLING_ENABLED) {
      console.log('Outbound real calls: DISABLED (mock telephony only)');
    }
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
