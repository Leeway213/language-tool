import { Workbook, CellValue } from 'exceljs';
import path, { ParsedPath } from 'path';
import { IFileProcessor, FileProcessor } from './FileProcessor';

export class ExcelProcessor extends FileProcessor {

  workbook = new Workbook();

  // fileInfo: ParsedPath;

  readed = false;

  // get filename() {
  // return this.fileInfo.name;
  // }

  // type: 'xlsx' | 'csv' = 'xlsx';

  constructor(filepath: string) {
    super(filepath);
    this.type = 'xlsx';
  }

  async readFile() {
    if (this.readed) { return; }
    await this.workbook[this.type as 'xlsx'].readFile(this.filepath);
    this.readed = true;
  }

  writeLine(line: CellValue[] | {
    [key: string]: CellValue;
  } | string, sheet: number | string = 'sheet1') {
    if (typeof line === 'string') {
      line = [line];
    }
    const worksheet = this.workbook.worksheets.find(v => v.name === sheet || v.id === sheet) || this.workbook.addWorksheet(typeof sheet === 'string' ? sheet : undefined);
    worksheet.addRow(line);
  }

  async *getLines(sheet?: number | string) {
    if (!this.readed) {
      // throw new Error('call read file first');
      await this.readFile();
    }
    if (sheet) {
      const worksheet = this.workbook.getWorksheet(sheet);

      if (!worksheet) {
        throw new Error('invalid sheet of ' + sheet);
      }
      let count = 0;
      let empty = 0;
      while (true) {
        const row = worksheet.getRow(count);
        if (row.hasValues) {
          yield row.values;
        } else {
          empty++;
        }

        if (empty > 100) {
          break;
        }
        count++;
      }
    } else {
      for (const worksheet of this.workbook.worksheets) {
        let count = 0;
        let empty = 0;
        while (true) {
          const row = worksheet.getRow(count);
          if (row.hasValues) {
            yield row.values;
          } else {
            empty++;
          }

          if (empty > 100) {
            break;
          }
          count++;
        }
      }
    }
  }

  save() {
    return this.workbook[this.type as 'xlsx'].writeFile(this.filepath);
  }
}

// (async () => {
//   const file = new ExcelProcessor('./test.xlsx');
//   file.writeLine('hello');
//   await file.save();
// })();