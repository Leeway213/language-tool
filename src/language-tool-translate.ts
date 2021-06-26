import commander from "commander";
import { existsSync } from "fs";
import { GoogleTranslateChecker } from "./lib/checkers/GoogleTranslateChecker";
import { createProcessor } from "./lib/file-processors";
import { ExcelProcessor } from "./lib/file-processors/ExcelProcessor";
import { GoogleTranslater } from "./lib/translaters/google";
import { log } from "./utils/log";

commander.usage('<txt or excel path>')
  .option('--source <source language>', '源语言')
  .option('--target <target language>', '目标语言')
  .option('--gcp', '是否使用gcp翻译');
commander.parse(process.argv);

let filepath = commander.args && commander.args[0];
const source = commander.source;
const target = commander.target;
const gcp = commander.gcp;
console.log('source', source);
console.log('target', target);
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
const translator = gcp ? new GoogleTranslater() : new GoogleTranslateChecker();

(async () => {
  const lines: string[] = [];
  for await (const line of reader.getLines()) {
    log(`translating ${line}...`, 'info');
    if (translator instanceof GoogleTranslater) {
      lines.push(line);
    } else {
      const translated = await translator.translate(line, source, target);
      writer.writeLine([line, translated]);
    }
  }

  if (translator instanceof GoogleTranslater) {
    const batchCount = 100;
    for (let i = 0; i < lines.length; i += batchCount) {
      const slice = lines.slice(i, i + batchCount);
      log(`translating batch count: ${slice.length}`, 'info');
      const translated = (await translator.batchTranslate(slice, source, target));
      log(`translated count: ${translated.length}`, 'info');
      for (let j = 0; j < slice.length; j++) {
        log(`writing line src: ${slice[j]} trans: ${translated[j]}`);
        writer.writeLine([slice[j], translated[j] || '']);
      }
    }
  }
})().finally(() => writer.save()).finally(() => process.exit(0));