import { FileProcessor } from "./FileProcessor";
import { TxtProcessor } from "./TxtProcessor";
import { ExcelProcessor } from "./ExcelProcessor";
import path from 'path';

export function createProcessor(filepath: string): FileProcessor {
  const info = path.parse(filepath);
  switch(info.ext) {
    case '.txt':
      return new TxtProcessor(filepath);
    case '.xls':
    case '.xlsx':
      return new ExcelProcessor(filepath);
    default:
      throw new Error(`file type ${info.ext} not supported`);
  }
}