import { FileProcessor } from "./FileProcessor";
import fs, { ReadStream } from 'fs';
import readline from 'readline';

export class TxtProcessor extends FileProcessor {

  private content: string = '';

  async *getLines(...args: any[]) {
    if (!this.content) {
      this.readFile();
    }
    const lines = this.content.split('\n');
    for (const line of lines) {
      if (line) {
        yield line;
      }
    }
  }

  writeLine(line: any, ...args: any[]): void {
    throw new Error("Method not implemented.");
  }

  readFile() {
    this.content = fs.readFileSync(this.filepath, { encoding: 'utf-8' });
  }
}

// (async () => {
//   const lines = new TxtProcessor('/Users/leeway/workspace/personal/drdk-spider/result/13062015.txt').getLines();
//   for await (const line of lines) {
//     console.log(line);
//   }
// })();
