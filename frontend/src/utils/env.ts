const env = {
  SIGNALLING_HTTP: import.meta.env.VITE_SIGNALLING_HTTP,
  SIGNALLING_WS: import.meta.env.VITE_SIGNALLING_WS,
  SIGNALLING_TIMEOUT_MS: import.meta.env.VITE_SIGNALLING_TIMEOUT_MS ?? 10000,
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL ?? "error",
}

export default env;
