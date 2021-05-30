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
      let text = line.text.replace(/(\n)+/g, ' ').replace(/\s\s+/g, ' ');
      const $ = cheerio.load(text);
      yield $.text();
    }
  }
  writeLine(line: any, ...args: any[]): void {
    throw new Error("Method not implemented.");
  }
}
