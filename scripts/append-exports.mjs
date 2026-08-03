#!/usr/bin/env node
/** Append ESM named exports to tish-compiled bundles (tish build does not emit export lines). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const bundles = [
  {
    file: "dist/deck.js",
    names: [
      "tokenize",
      "isNumberToken",
      "parseProgram",
      "applyTplSource",
      "applyParsed",
      "findChannelById",
      "emitProject",
      "emitLivePlayback",
      "deckMixLine",
      "createTplLineStream",
      "tplLineStreamPush",
      "parseGenBlock",
      "builtinMacros",
      "lookupMacro",
      "expandMacroBody",
      "coDjLineAllowedForSkills",
      "skillIdsAllowMaster",
      "hasSkill",
      "applyCoDjTplSource",
      "actorMayEditTrack",
      "laneCanMaster",
      "ensureCoDjMeta",
      "makeStep",
      "makeSteps16",
      "makeChannel",
      "emptyProjectShell",
      "defaultParamsForGeneratorId",
      "projectToJson",
      "projectFromJson",
      "loadProjectFromTpl",
      "loadDefaultDeckardProject",
      "generatorCatalog",
      "normalizeBasicOscWaveform",
    ],
  },
];

for (const { file, names } of bundles) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    console.error(`missing ${file} — run tish build first`);
    process.exit(1);
  }
  fs.appendFileSync(p, `\nexport { ${names.join(", ")} };\n`);
}
