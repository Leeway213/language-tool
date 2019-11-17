

import commander from 'commander';
import camelcase from 'camelcase';
import { ExcelProcessor } from './lib/file-processors/ExcelProcessor';
import { LanguageToolOrgDetector } from './lib/detectors/LanguageToolOrgDetector';
import { log } from './utils/log';

commander.usage('<excel file path>')
  .option('--sheet <sheet>', 'specify sheet name')
  .option('--min <number>', 'min count of a sentence', parseInt)
  .option('--max <number>', 'max count of a sentence', parseInt)
  .option('--language-check <language>', 'language check', (str) => camelcase(str, { pascalCase: true }))
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

const reader = new ExcelProcessor(excelFile);

const writer = new ExcelProcessor(`${reader.filename}_pluck.xlsx`);

const checker = new LanguageToolOrgDetector();

(async () => {
  await reader.readFile();
  let count = 0;
  let loop = 0;
  if (sheetName) {
    const lines = reader.getLines(sheetName);
    for await (const line of lines) {
      loop++;
      let text = '';
      if (line instanceof Array && line[1]) {
        text = line[1]!.toString()
      }
      log(`${loop} - checking ${text}`, 'info');
      if (min) {
        if (text.split(' ').length < min) {
          log(`min check not pass: ${text}`, 'warning');
          continue;
        }
        log(`min check pass: ${text}`, 'success');
      }

      if (max) {
        if (text.split(' ').length > max) {
          log(`max check not pass: ${text}`, 'warning');
          continue;
        }
        log(`max check pass: ${text}`, 'success');
      }

      if (language) {
        try {
          const errors = await checker.check(text, language);
          if (errors.length > 0) {
            log(`language check not pass: ${text}`, 'warning');
            continue;
          }
          log(`language check pass: ${text}`, 'success');
        } catch (error) {
          log(error.message, 'error');
          continue;
        }
      }

      writer.writeLine(line);
      count++;
    }
  } else {
    for (const sheet of reader.workbook.worksheets) {
      const lines = reader.getLines(sheet.name);
      for await (const line of lines) {
        loop++;
        let text = '';
        if (line instanceof Array && line[1]) {
          text = line[1]!.toString()
        }
        log(`${loop} - checking ${text}`, 'info');
        if (min) {
          if (text.split(' ').length < min) {
            log(`min check not pass: ${text}`, 'warning');
            continue;
          }
          log(`min check pass: ${text}`, 'success');
        }

        if (max) {
          if (text.split(' ').length > max) {
            log(`max check not pass: ${text}`, 'warning');
            continue;
          }
          log(`max check pass: ${text}`, 'success');
        }

        if (language) {
          try {
            const errors = await checker.check(text, language);
            if (errors.length > 0) {
              log(`language check not pass: ${text}`, 'warning');
              continue;
            }
            log(`language check pass: ${text}`, 'success');
          } catch (error) {
            log(error.message, 'error');
            continue;
          }
        }

        writer.writeLine(line);
        count++;
      }
    }
  }

  if (count > 0) {
    await writer.save();
  }
})().finally(() => process.exit());

