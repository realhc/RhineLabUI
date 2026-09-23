import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
const root = "release/packages/make";
async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(file)));
    else if (file.endsWith(".zip")) result.push(file);
  }
  return result;
}
const lines = [];
for (const file of await walk(root))
  lines.push(
    `${createHash("sha256")
      .update(await readFile(file))
      .digest("hex")}  ${relative(root, file).replaceAll("\\", "/")}`,
  );
if (!lines.length) throw new Error("No portable archive found");
await writeFile(`${root}/SHA256SUMS.txt`, lines.join("\n") + "\n");
console.log(lines.join("\n"));
