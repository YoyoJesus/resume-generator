import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FOOTER =
  /(?:^|\r?\n)Agent provider: ([^\r\n<>]+)\r?\nAgent model: ([^\r\n<>]+)\r?\nAgent harness: ([^\r\n<>]+)\s*$/;
const HUMAN_DECLARATION =
  /(?:^|\r?\n)(?:AI assistance: no|Not AI-generated)\s*(?:\r?\n|$)/i;
const AGENT_MARKER = /(?:^|\r?\n)Agent (?:provider|model|harness):/i;

export function validateAttribution(body) {
  if (typeof body !== "string")
    return { valid: false, message: "Submission body is missing." };
  const authoredBody = body.replace(
    /\r?\n*<!-- This is an auto-generated comment: release notes by coderabbit\.ai -->[\s\S]*$/,
    "",
  );
  const footer = FOOTER.exec(authoredBody);
  if (footer) return { valid: true, message: "Valid AI attribution footer." };
  if (AGENT_MARKER.test(authoredBody)) {
    return {
      valid: false,
      message:
        "AI attribution must be the exact provider/model/harness footer at the end of the submission.",
    };
  }
  if (HUMAN_DECLARATION.test(authoredBody))
    return { valid: true, message: "Submission declares no AI assistance." };
  return {
    valid: false,
    message:
      'Declare "AI assistance: no" (or "Not AI-generated" for an issue), or add the required AI footer.',
  };
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GITHUB_EVENT_PATH is required.");
  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  const body = event.pull_request?.body ?? event.issue?.body;
  const result = validateAttribution(body);
  console.log(result.message);
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
