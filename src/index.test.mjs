import fs from "node:fs/promises";
import { remark } from "remark";
import remarkAgda from "./index.mjs";
import { VFile } from "vfile";
import path from "node:path";

const root = path.dirname(import.meta.dirname);
const sourcePath = path.join(root, "input.lagda.md");
const sourceFile = new VFile({
  path: sourcePath,
  value: await fs.readFile(sourcePath),
});
const outputFile = await remark().use(remarkAgda).process(sourceFile);

await fs.writeFile(path.join(root, "output.md"), String(outputFile));
