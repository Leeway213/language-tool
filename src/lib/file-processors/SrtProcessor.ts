import { FileProcessor } from "./FileProcessor";
import SrtParser from 'srt-parser-2';
import { readFileSync } from "fs";
import cheerio from 'cheerio';

export class SrtProcessor extends FileProcessor {

  private parser = new SrtParser();

  private content: {
    id: string;
    startTime: string;
    endTime: string;
    text: string;
  }[] = [];

  constructor(filepath: string) {
    super(filepath);
  }

  async *getLines(): AsyncGenerator<any, any, any> {
    const data = readFileSync(this.filepath, { encoding: 'utf-8' });
    this.content = this.parser.fromSrt(data);
    for (const line of this.content) {
      const $ = cheerio.load(line.text);
      const text = $.text().split('\n');
      for (const t of text) {
        yield t;
      }
    }
  }
  writeLine(line: any, ...args: any[]): void {
    throw new Error("Method not implemented.");
  }
}
