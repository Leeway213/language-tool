import commander from "commander";
import { existsSync } from "fs";
import { GoogleTranslateChecker } from "./lib/checkers/GoogleTranslateChecker";
import { createProcessor } from "./lib/file-processors";
import { ExcelProcessor } from "./lib/file-processors/ExcelProcessor";
import { breakSentence } from "./utils/break-sentences";
import { log } from "./utils/log";

commander.usage('<txt or excel path>')
  .option('--translate <translate>', '自动生成翻译');
commander.parse(process.argv);

let filepath = commander.args && commander.args[0];
debugger
const translate = commander.translate;
console.log(filepath);

if (!filepath) {
  commander.help();
  process.exit(1);
}
if (!existsSync(filepath)) {
  log(`${filepath} not exists`, 'error');
  process.exit(1);
}
const reader = createProcessor(filepath);
const writer = new ExcelProcessor(`${reader.fileInfo.dir}/${reader.filename}_sentences.xlsx`);
const translator = new GoogleTranslateChecker();

(async () => {
  let cache = '';
  let count = 0;
  for await (const line of reader.getLines()) {
    const newLines = breakSentence(line);
    log(`break sentences count: ${newLines.length}`, 'info');
    for (let newLine of newLines) {
      newLine = newLine.trim();
      cache += newLine;
      if (translate) {
        if (cache.length > 2000) {
          log(`translating: ${newLine}`, 'info');
          const translated = await translator.translate(cache, translate);
          log(`translated: ${translated}`, 'info');
          const lines = breakSentence(cache);
          const translated_lines = breakSentence(translated);
          for (let i = 0; i < lines.length; i++) {
            writer.writeLine([lines[i], translated_lines[i]]);
            log(`${++count} line writed`);
          }
          cache = '';
        }
      } else {
        if (newLine) {
          writer.writeLine([newLine]);
          log(`${++count} line writed`);
          log(`write to file: ${newLine}`, 'info');
        }
      }
    }
  }
})().finally(() => writer.save());
