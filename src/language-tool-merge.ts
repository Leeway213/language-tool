import commander from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { log } from './utils/log';
import { ExcelProcessor } from './lib/file-processors/ExcelProcessor';

commander.usage('<directory includes excel files>')
  .parse(process.argv);

const filepath = commander.args[0];

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
  const writer = new ExcelProcessor(path.resolve(filepath, 'merge.xlsx'));
  for (const item of fs.readdirSync(filepath)) {
    const p = path.resolve(filepath, item);
    const fileInfo = path.parse(p);
    switch (fileInfo.ext) {
      case '.xlsx':
      case '.xls':
        const reader = new ExcelProcessor(p);
        const lines = reader.getLines();
        for await (const line of lines) {
          writer.writeLine(line);
        }
        break;
    }
  }
  await writer.save();
})().finally(() => process.exit());
