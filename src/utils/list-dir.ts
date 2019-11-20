
import fs from 'fs';
import path from 'path';
import { log } from './log';
import { ExcelProcessor } from '../lib/file-processors/ExcelProcessor';
import { LanguageToolOrgChecker } from '../lib/checkers/LanguageToolOrgChecker';
import { Observable } from 'rxjs';
import { CellValue } from 'exceljs';
import { checkers } from '../lib/checkers';

const DIR = path.resolve(__dirname + '/../../test/da');

const files = fs.readdirSync(DIR);

let min: any = undefined;
let max: any = undefined;
let sheetName = undefined;
let language = 'da';
let checker = checkers['google'];
// let language = undefined;

(async () => {
  for (const file of files) {
    const filepath = path.resolve(DIR, file);
    const reader = new ExcelProcessor(filepath);

    const writer = new ExcelProcessor(`${reader.filename}_pluck.xlsx`);


    await (async () => {
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
            let hasError: any = checker.check(text, language);
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
    })();
  }
})();
