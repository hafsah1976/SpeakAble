import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { buildOpenApiDocument } from "../openapi.js";

const outputPath = resolve(process.cwd(), process.argv[2] ?? "../../docs/openapi-node.json");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
