import { mkdir, writeFile } from "node:fs/promises";
import { zodToJsonSchema } from "zod-to-json-schema";
import { RequirementContractSchema, ReviewCoverageReportSchema } from "../packages/core/src/index.js";
await mkdir("schemas", { recursive: true });
for (const [name, schema] of Object.entries({ "requirement-contract": RequirementContractSchema, "coverage-report": ReviewCoverageReportSchema })) await writeFile(`schemas/${name}.schema.json`, JSON.stringify(zodToJsonSchema(schema, name), null, 2) + "\n");
