import commander from "commander";
import { existsSync } from "fs";
import { GoogleTranslateChecker } from "./lib/checkers/GoogleTranslateChecker";
import { createProcessor } from "./lib/file-processors";
import { ExcelProcessor } from "./lib/file-processors/ExcelProcessor";
import { GoogleTranslater } from "./lib/translaters/google";
import { breakSentence } from "./utils/break-sentences";
import { log } from "./utils/log";

commander.usage('<txt or excel path>')
  .option('--break <true|false>', '是否断句 默认断句')
  .option('--translate <translate>', '自动生成翻译');
commander.parse(process.argv);

let filepath = commander.args && commander.args[0];
const translate = commander.translate;
const br = commander.break === undefined ? true : commander.break === 'true';
console.log(typeof br, br);
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
const translator = new GoogleTranslater();

(async () => {
  let cache: string[] = [];
  let count = 0;
  for await (const line of reader.getLines()) {
    cache.push(line);
  }
  const newLines = br ? breakSentence(cache.join('\n')) : cache;
  log(`break sentences count: ${newLines.length}`, 'info');
  if (translate && typeof translator.batchTranslate === 'function') {
    const sources = newLines.filter(l => l.length > 3).map(l => l.replace(/^\'/g, '‘')).map(l => l.replace(/\'/g, '’'));
    log(`use batch translator...`, 'info');
    const batchCount = 100;
    for (let i = 0; i < sources.length; i += batchCount) {
      const slice = sources.slice(i, i + batchCount);
      log(`translating batch count: ${slice.length}`, 'info');
      const translated = (await translator.batchTranslate(slice, translate, 'en')).map(l => l.replace(/^\'/g, '‘')).map(l => l.replace(/\'/g, '’'));
      log(`translated count: ${translated.length}`, 'info');
      for (let j = 0; j < slice.length; j++) {
        log(`writing line src: ${slice[j]} trans: ${translated[j]}`);
        writer.writeLine([slice[j], translated[j] || '']);
      }
    }
  } else {
    for (let newLine of newLines) {
      newLine = newLine.trim();
      if (newLine.length > 3) {
        // cache += newLine + '\n';
        newLine.replace(/^\'/g, '‘');
        newLine.replace(/\'/g, '’');
        if (translate) {
          log(`translating: ${newLine}`, 'info');
          const translated = await translator.translate(newLine, translate, 'en');
          log(`translated: ${translated}`, 'info');
          translated.replace(/^\'/g, '‘');
          translated.replace(/\'/g, '’');
          writer.writeLine([newLine, translated]);
        } else {
          writer.writeLine([newLine]);
          log(`${++count} line writed`);
          log(`write to file: ${newLine}`, 'info');
        }
      }
    }
  }
})().finally(() => writer.save()).finally(() => process.exit(0));
