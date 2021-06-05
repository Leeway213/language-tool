import commander from "commander";
import { existsSync } from "fs";
import { GoogleTranslateChecker } from "./lib/checkers/GoogleTranslateChecker";
import { createProcessor } from "./lib/file-processors";
import { ExcelProcessor } from "./lib/file-processors/ExcelProcessor";
import { log } from "./utils/log";

commander.usage('<txt or excel path>')
  .option('--source <source language>', '源语言')
  .option('--target <target language>', '目标语言');
commander.parse(process.argv);

let filepath = commander.args && commander.args[0];
const source = commander.source;
const target = commander.target;
if (!filepath) {
  commander.help();
  process.exit(1);
}

if (!existsSync(filepath)) {
  log(`${filepath} not exists`, 'error');
  process.exit(1);
}

const reader = createProcessor(filepath);
const writer = new ExcelProcessor(`${reader.fileInfo.dir}/${reader.filename}_translated.xlsx`);
const translator = new GoogleTranslateChecker();

(async () => {
  for await (const line of reader.getLines()) {
    log(`translating ${line}...`, 'info');
    const translated = await translator.translate(line, source);
    writer.writeLine([line, translated]);
  }
})().finally(() => writer.save()).finally(() => process.exit(0));