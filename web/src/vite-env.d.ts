/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute base URL of the API, e.g. "https://vaniq-api.onrender.com/api".
   *  Unset in dev → falls back to "/api" (proxied by Vite). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
