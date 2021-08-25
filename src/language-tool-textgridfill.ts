import commander from 'commander';
import { writeFileSync } from 'fs';
import { TextgridProcessor } from './lib/file-processors/TextgridProcessor';
import { TxtProcessor } from './lib/file-processors/TxtProcessor';
import { serializeTextgrid } from './lib/praatio/textgrid_io';

commander.usage('<textgrid file path>')
	.option('--source <source txt>', '源文本')
	.option('--skip-first', '是否跳过首段');
commander.parse(process.argv);

const textgridPath = commander.args[0];

const source = commander.source;
const skipFirst = commander.skipFirst;

(async () => {
	const textgridProcessor = new TextgridProcessor(textgridPath);
	const txt = new TxtProcessor(source);
	if (skipFirst) {
		textgridProcessor.writeLine('');
	}
	for await (const line of txt.getLines()) {
		const splits = line.split(/ |\t/);
		const value = splits[splits.length - 1].trim();
		textgridProcessor.writeLine(value);
		textgridProcessor.writeLine('');
	}
	const res = serializeTextgrid(textgridProcessor.textgrid);
	writeFileSync(textgridProcessor.fileInfo.dir + '/' + textgridProcessor.filename + '_new' + textgridProcessor.fileInfo.ext, res, { encoding: 'utf-8' });
})();
