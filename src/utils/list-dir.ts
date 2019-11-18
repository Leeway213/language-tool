
import fs from 'fs';
import path from 'path';
import { log } from './log';
import { ExcelProcessor } from '../lib/file-processors/ExcelProcessor';
import { LanguageToolOrgChecker } from '../lib/checkers/LanguageToolOrgChecker';

const DIR = path.resolve(__dirname + '/../../test/ebook');

const files = fs.readdirSync(DIR);

let min = undefined;
let max = undefined;
let sheetName = undefined;
let language = 'Swedish';
// let language = undefined;

(async () => {
  for (const file of files) {
    const filepath = path.resolve(DIR, file);
    const reader = new ExcelProcessor(filepath);

    const writer = new ExcelProcessor(`${reader.filename}_pluck.xlsx`);

    const checker = new LanguageToolOrgChecker();

    await (async () => {
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
              const hasError = await checker.check(text, language);
              if (hasError) {
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
              const cell = line[1];
              if (typeof cell === 'string') {
                text = cell;
              } else if ('richText' in (cell as any)) {
                const texts: any[]  = (cell as any).richText;
                text = texts.map(v => v.text).join('');
              }
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
                const hasError = await checker.check(text, language);
                if (hasError) {
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
    })();
  }
})();
