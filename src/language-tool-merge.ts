import commander from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { log } from './utils/log';
import { ExcelProcessor } from './lib/file-processors/ExcelProcessor';
import { createProcessor } from './lib/file-processors';

commander.usage('<directory includes txt or excel files>')
  .option('--output <txt | excel>', '输出文件格式');

commander.parse(process.argv)

const filepath = commander.args[0];
const output = commander.output || 'txt';

if (!filepath) {
  commander.help();
  process.exit();
}

if (!fs.existsSync(filepath)) {
  log(`${filepath} not exists`, 'error');
  process.exit();
}

if (!fs.statSync(filepath).isDirectory()) {
  log('please input a directory path', 'error');
  process.exit();
}

(async () => {
  // const writer = new ExcelProcessor(path.resolve(filepath, 'merge.xlsx'));
  const writer = createProcessor(path.resolve(filepath, 'merge.' + output));
  for (const item of fs.readdirSync(filepath)) {
    const p = path.resolve(filepath, item);
    log(`reading file: ${p}`, 'info');
    const reader = createProcessor(p);
    for await (const line of reader.getLines()) {
      log(`write line: ${line}`, 'info');
      writer.writeLine(line);
    }
  }
  if (writer instanceof ExcelProcessor) {
    await writer.save();
  }
})().finally(() => process.exit());
