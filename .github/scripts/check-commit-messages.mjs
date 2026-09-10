import { execFileSync } from "node:child_process";

const [base, head] = process.argv.slice(2);

if (!base || !head) {
  console.error("Usage: node check-commit-messages.mjs <base> <head>");
  process.exit(2);
}

const conventionalCommit =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9][a-z0-9._/-]*\))?!?: \S.*$/;

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trimEnd();
const commits = git("rev-list", "--reverse", `${base}..${head}`)
  .split(/\r?\n/)
  .filter(Boolean);

const failures = [];

for (const commit of commits) {
  const message = git("show", "-s", "--format=%B", commit);
  const lines = message.split(/\r?\n/);
  const subject = lines[0] ?? "";

  if (lines.length !== 1) {
    failures.push(
      `${commit.slice(0, 8)} has a multi-line commit message: ${subject}`,
    );
    continue;
  }

  if (!conventionalCommit.test(subject)) {
    failures.push(
      `${commit.slice(0, 8)} is not a valid Conventional Commit: ${subject}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Commit message validation failed.");
  console.error("Use one line in the form: type(optional-scope): description");
  console.error(
    "Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.",
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Validated ${commits.length} commit message${commits.length === 1 ? "" : "s"}.`,
);
