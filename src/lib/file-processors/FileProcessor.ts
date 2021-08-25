import { ParsedPath } from "path";
import path from 'path';
import { ExcelProcessor } from "./ExcelProcessor";
import { TxtProcessor } from "./TxtProcessor";

export interface IFileProcessor {
  getLines(...args: any[]): AsyncGenerator<any>;
}

export abstract class FileProcessor {

  fileInfo: ParsedPath;

  get filename() {
    return this.fileInfo.name;
  }

  type: 'xlsx' | 'txt' | 'srt' | 'textgrid';

  constructor(protected filepath: string) {
    this.fileInfo = path.parse(this.filepath);
    if (this.fileInfo.ext === '.xls' || this.fileInfo.ext === '.xlsx') {
      this.type = 'xlsx';
    } else if (this.fileInfo.ext === '.txt') {
      this.type = 'txt';
    } else if (this.fileInfo.ext === '.srt') {
      this.type = 'srt';
    } else if (this.fileInfo.ext.toLowerCase() === '.textgrid') {
      this.type = 'textgrid';
    } else {
      throw new Error('not support');
    }
  }

  abstract getLines(...args: any[]): AsyncGenerator<any, any, any>;
  abstract writeLine(line: any, ...args: any[]): void;
}
