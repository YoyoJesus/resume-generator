// Tailoring waits for parallel O*NET calls before OpenAI: 10s + 35s leaves
// headroom for parsing and the JSON response within the 60s route limit.
export const ONET_TIMEOUT_MS = 10_000;
export const OPENAI_REQUEST_OPTIONS = { timeout: 35_000, maxRetries: 0 } as const;
