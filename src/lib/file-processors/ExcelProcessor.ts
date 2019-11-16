import { IReader } from "./IReader";
import { Workbook, CellValue } from 'exceljs';
import path, { ParsedPath } from 'path';

export class ExcelProcessor {

  workbook = new Workbook();

  fileInfo: ParsedPath;

  readed = false;

  get filename() {
    return this.fileInfo.name;
  }

  type: 'xlsx' | 'csv' = 'xlsx';

  constructor(public filepath: string) {
    this.fileInfo = path.parse(this.filepath);
    let type: 'xlsx' | 'csv' = 'xlsx';
    if (this.fileInfo.ext === '.csv') {
      throw new Error('not support');
    } else if (this.fileInfo.ext === '.xls' || this.fileInfo.ext === '.xlsx') {
      this.type = 'xlsx';
    } else {
      throw new Error('not support');
    }
  }

  async readFile() {
    if (this.readed) { return; }
    await this.workbook[this.type].readFile(this.filepath);
    this.readed = true;
  }

  writeLine(line: CellValue[] | {
    [key: string]: CellValue;
  }, sheet: number | string = 'sheet1') {
    const worksheet = this.workbook.worksheets.find(v => v.name === sheet || v.id === sheet) || this.workbook.addWorksheet(typeof sheet === 'string' ? sheet : undefined);
    worksheet.addRow(line);
  }

  async *getLines(sheet: number | string) {
    if (!this.readed) {
      throw new Error('call read file first');
    }
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
  }

  save() {
    return this.workbook[this.type].writeFile(this.filepath);
  }
}

// (async () => {
//   for await (const item of new ExcelProcessor().getLines('./test/test.xlsx')) {
//     console.log(item);
//     debugger
//   }
// })();