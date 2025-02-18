import fs from "node:fs/promises";
import { remark } from "remark";
import remarkAgda from "./index.js";
import { VFile } from "vfile";

const sourcePath = "input.lagda.md";
const sourceFile = new VFile({
  path: sourcePath,
  value: await fs.readFile(sourcePath),
});
const outputFile = await remark().use(remarkAgda).process(sourceFile);

await fs.writeFile("output.md", String(outputFile));
