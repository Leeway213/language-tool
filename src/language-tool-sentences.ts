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
  for await (const line of reader.getLines()) {
    const newLines = breakSentence(line);
    log(`break sentences count: ${newLines.length}`, 'info');
    for (let newLine of newLines) {
      newLine = newLine.trim();
      if (newLine) {
        if (translate) {
          log(`translating: ${newLine}`, 'info');
          const translated = await translator.translate(newLine, translate);
          log(`translated: ${translated}`, 'info');
          writer.writeLine([newLine, translated]);
        } else {
          writer.writeLine([newLine]);
          log(`write to file: ${newLine}`, 'info');
        }
      }
    }
  }
})().finally(() => writer.save());
