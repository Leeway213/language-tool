

import commander from 'commander';
import camelcase from 'camelcase';
import { ExcelProcessor } from './lib/file-processors/ExcelProcessor';
import { log } from './utils/log';
import { checkers } from './lib/checkers';
import { Observable } from 'rxjs';
import { CellValue } from 'exceljs';

commander.usage('<excel file path>')
  .option('--sheet <sheet>', 'specify sheet name')
  .option('--min <number>', 'min count of a sentence', parseInt)
  .option('--max <number>', 'max count of a sentence', parseInt)
  .option('--language-check <language>', 'language check', (str) => camelcase(str, { pascalCase: true }))
  .option(`--checker <${Object.keys(checkers).join(' | ')}>`, `specify checker ${Object.keys(checkers).join(' or ')}`, 'languagetoolorg')
  .parse(process.argv);

const excelFile = commander.args[0];

if (!excelFile) {
  commander.help();
  process.exit();
}

const sheetName = commander.sheet;
const min = commander.min;
const max = commander.max;
const language = (commander.languageCheck);
const checker = checkers[commander.checker];

const reader = new ExcelProcessor(excelFile);

const writer = new ExcelProcessor(`${reader.filename}_pluck.xlsx`);

// const checker = new LanguageToolOrgChecker();

if (language) {
  log(`using language checker: ${commander.checker}`, 'info');
}

(async () => {
  await reader.readFile();
  let count = 0;
  let loop = 0;
  const func = async (line: CellValue[] | {
    [key: string]: CellValue;
  }) => {
    loop++;
    let text = '';
    if (line instanceof Array && line[1]) {
      const cell = line[1];
      if (typeof cell === 'string') {
        text = cell;
      } else if ('richText' in (cell as any)) {
        const texts: any[] = (cell as any).richText;
        text = texts.map(v => v.text).join('');
      }
    }
    log(`${loop} - checking ${text}`, 'info');
    if (min) {
      if (text.split(' ').length < min) {
        log(`min check not pass: ${text}`, 'warning');
        return;
      }
      log(`min check pass: ${text}`, 'success');
    }

    if (max) {
      if (text.split(' ').length > max) {
        log(`max check not pass: ${text}`, 'warning');
        return;
      }
      log(`max check pass: ${text}`, 'success');
    }

    if (language) {
      try {
        let hasError = checker.check(text, language);
        if (hasError instanceof Observable) {
          hasError = hasError.toPromise();
        } else if (hasError instanceof Promise) {
          hasError = await hasError;
        }
        if (hasError) {
          log(`language check not pass: ${text}`, 'warning');
          return;
        }
        log(`language check pass: ${text}`, 'success');
      } catch (error) {
        log(error.message, 'error');
        return;
      }
    }

    writer.writeLine(line);
    count++;
  };
  if (sheetName) {
    const lines = reader.getLines(sheetName);
    for await (const line of lines) {
      await func(line);
    }
  } else {
    for (const sheet of reader.workbook.worksheets) {
      const lines = reader.getLines(sheet.name);
      for await (const line of lines) {
        await func(line);
      }
    }
  }

  if (count > 0) {
    await writer.save();
  }
})().finally(() => process.exit());

