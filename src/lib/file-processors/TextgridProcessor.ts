import { FileProcessor } from "./FileProcessor";
import fs from 'fs';
import { parseTextgrid, serializeTextgrid } from '../praatio/textgrid_io';
import { Textgrid } from "../praatio/textgrid";

export class TextgridProcessor extends FileProcessor {

	textgrid: Textgrid;

	index = 0;

	constructor(filepath: string) {
		super(filepath);
		const txt = fs.readFileSync(filepath, { encoding: 'utf-8' });
		this.textgrid = parseTextgrid(txt, true);
	}

	getLines(...args: any[]): AsyncGenerator<any, any, any> {
		throw new Error("Method not implemented.");
	}

	writeLine(line: any, ...args: any[]): void {
		const dict = this.textgrid.tierDict[Object.keys(this.textgrid.tierDict)[0]];
		if (dict.entryList.length > this.index) {
			dict.entryList[this.index][2] = line;
			this.index++;
		}
	}
}
