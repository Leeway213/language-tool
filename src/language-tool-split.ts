
import commander from 'commander';
import fs from 'fs-extra';
import { log } from './utils/log';
import path from 'path';
import { ExcelProcessor } from './lib/file-processors/ExcelProcessor';

const SUPPORT_TYPE = [
  '.xlsx',
  '.xls',
  '.txt'
]

commander.usage('<filepath>')
  .option('--sheet <sheet>', 'specify sheet name')
  .option('--slice <slice>', 'slice count', parseInt);

commander.parse(process.argv);

const filepath = commander.args[0];
const sheetName = commander.sheet;
const slice = commander.slice;

if (!filepath) {
  commander.help();
  process.exit();
}

if (!fs.existsSync(filepath)) {
  log(`${filepath} not found`, 'error');
  process.exit();
}

const fileInfo = (path.parse(filepath));

if (!SUPPORT_TYPE.includes(fileInfo.ext)) {
  log(`Only support file type: [${SUPPORT_TYPE.join(' ')}]`, 'warning');
  process.exit();
}

switch (fileInfo.ext) {
  case '.xls':
  case '.xlsx':
    log('use excel reader');
    processExcel(sheetName, slice);
    break;
  case '.txt':
    log('use txt reader');
    break;
}

async function processExcel(sheet?: number | string, splice = 1100, withHeader = false) {

  let head: any;
  const processSheet = async (sheet: number | string) => {
    try {
      const lines = reader.getLines(sheet);
      let count = 0;
      let writer: ExcelProcessor | null = null;
      for await (const line of lines) {
        if (withHeader && count === 0) {
          head = line;
        }
        if (count % (splice) === 0) {
          if (writer) {
            await writer.save();
          }
          const name = `${reader.filename}_${typeof sheet === 'string' ? sheet : 'sheet' + sheet}_${count}.xlsx`;
          writer = new ExcelProcessor(name);
          if (head) {
            writer.writeLine(head);
          }
          writer.writeLine(line);
        } else if (writer) {
          writer.writeLine(line);
        }
        count++;
      }
    } catch (error) {
      log(error.message, 'error');
    }

  }
  const reader = new ExcelProcessor(filepath);
  await reader.readFile();
  if (sheet) {
    processSheet(sheet);
  } else {
    for (const sheet of reader.workbook.worksheets) {
      processSheet(sheet.id);
    }
  }
}
