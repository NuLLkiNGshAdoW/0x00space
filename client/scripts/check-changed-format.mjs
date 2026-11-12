import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(scriptDirectory, "..");
const repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
let baseSha = process.env.PRETTIER_BASE_SHA;

if (!baseSha || /^0+$/.test(baseSha)) {
  const defaultBranch = process.env.PRETTIER_DEFAULT_BRANCH;
  if (!defaultBranch) {
    throw new Error("PRETTIER_BASE_SHA or PRETTIER_DEFAULT_BRANCH must be set.");
  }
  baseSha = execFileSync("git", ["merge-base", "HEAD", `origin/${defaultBranch}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}

const changedPaths = execFileSync(
  "git",
  ["diff", "--name-only", "-z", "--diff-filter=ACMRT", baseSha, "--", "client"],
  { cwd: repositoryRoot },
)
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const untrackedPaths = execFileSync(
  "git",
  ["ls-files", "--others", "--exclude-standard", "-z", "--", "client"],
  { cwd: repositoryRoot },
)
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const files = [...new Set([...changedPaths, ...untrackedPaths])].filter((file) =>
  file.startsWith("client/"),
);
const unformatted = [];

for (const relativePath of files) {
  const filePath = path.join(repositoryRoot, relativePath);
  try {
    await access(filePath);
  } catch {
    continue;
  }

  const fileInfo = await prettier.getFileInfo(filePath, {
    ignorePath: path.join(clientDirectory, ".prettierignore"),
  });
  if (fileInfo.ignored || !fileInfo.inferredParser) {
    continue;
  }

  const options = await prettier.resolveConfig(filePath);
  const source = await readFile(filePath, "utf8");
  if (!(await prettier.check(source, { ...options, filepath: filePath }))) {
    unformatted.push(relativePath);
  }
}

if (unformatted.length) {
  console.error("Changed files need formatting:");
  console.error(unformatted.map((file) => `  ${file}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Formatting check passed for ${files.length} changed file(s).`);
}
