import commander from "commander";
import fs from "fs";
import { KEYSTORE_FILE, KEYSTORE_PATH } from "./constants";
import { Bucket, Storage } from '@google-cloud/storage';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { log } from "./utils/log";
import { IOcrResult } from "./lib/IOcrResult";

commander.usage('<pdf file>')
	.option('--lang <language tag>', '设置语言: en th cn')
	.option('--merge', '是否合并')
commander.parse(process.argv);

let filepath = commander.args && commander.args[0];
const lang = commander.lang;
const merge = commander.merge;

if (!filepath || !lang || !filepath.endsWith('.pdf')) {
	commander.help();
	process.exit(0);
}

const outputDir = filepath.replace('.pdf', '');
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir);
}


function validateKeystore() {
	if (!fs.existsSync(KEYSTORE_FILE)) {
		throw new Error('先设置gcp keystore: language-tool gcp <keystore>')
	}
	process.env.GOOGLE_APPLICATION_CREDENTIALS = KEYSTORE_FILE;
}

async function getBucket(storage: Storage) {
	log(`using bucket: language-tool`, 'info');
	let bucket = storage.bucket('language-tool');
	const [exists] = await bucket.exists();
	if (!exists) {
		log(`bucket 'language-tool' not exists, creating`, 'info');
		const res = await storage.createBucket(bucket.name, { location: 'ASIA' });
		bucket = res[0];
		log(`bucket 'language-tool' created`, 'info');
	}
	return bucket;
}

async function upload(bucket: Bucket, filepath: string, onProgress?: (p: any) => void) {
	log(`uploading ${filepath}...`, 'info');
	const paths = filepath.split('/');
	const filename = paths[paths.length - 1];
	const res = await bucket.upload(filepath, {
		destination: `${lang}/books/${filename}`,
		onUploadProgress: onProgress
	});
	return res;
}

async function ocr(sourceUri: string, destinationUri: string) {
	const inputConfig = {
		mimeType: 'application/pdf',
		gcsSource: {
			uri: sourceUri,
		},
	};
	const outputConfig = {
		gcsDestination: {
			uri: destinationUri,
		}
	};
	const features = [{ type: 'DOCUMENT_TEXT_DETECTION' }];
	const request = {
		requests: [
			{
				inputConfig: inputConfig,
				features: features,
				outputConfig: outputConfig,
			},
		],
	};
	const client = new ImageAnnotatorClient();
	const timer = setInterval(() => {
		log('ocr processing...', 'info');
	}, 1000);
	const [operation] = await client.asyncBatchAnnotateFiles(request as any);
	const [response, operationMeta] = await operation.promise().finally(() => clearInterval(timer));
	const destination = response.responses && response.responses[0]?.outputConfig?.gcsDestination?.uri;
	log(`ocr completed. result: ${destination}`, 'info');
	return destination;
}

async function parsePages(bucket: Bucket, resultDir: string) {
	const [files] = await bucket.getFiles({
		prefix: resultDir,
	});
	await Promise.all(files.map(async file => {
		const paths = file.name.split('/');
		const name = paths[paths.length - 1];
		const destination = `${outputDir}/${name}`;
		log(`ocr result ${file.name} downloading...`, 'info');
		const [buffer] = await file.download();
		const obj: IOcrResult = JSON.parse(buffer.toString('utf-8'));
		log(`ocr result ${file.name} downloaded`, 'info');

		for (const res of obj.responses) {
			const pageNumber = res.context.pageNumber;
			log(`page ${pageNumber} parsing...`, 'info');
			fs.writeFileSync(`${outputDir}/${pageNumber}.txt`, '', { encoding: 'utf-8' });
			for (const page of res.fullTextAnnotation?.pages || []) {
				let paragraphNum = 0;
				for (const block of page.blocks) {
					for (const paragraph of block.paragraphs || []) {
						log(`page ${pageNumber} paragraph ${paragraphNum + 1} parsing...`, 'info');
						for (const word of paragraph.words || []) {
							for (const symbol of word.symbols || []) {
								fs.appendFileSync(`${outputDir}/${pageNumber}.txt`, symbol.text, { encoding: 'utf-8' });
								if (symbol.property?.type === 'LINE_BREAK') {
									fs.appendFileSync(`${outputDir}/${pageNumber}.txt`, '\n', { encoding: 'utf-8' });
								} else if (symbol.property?.type === 'SPACE') {
									fs.appendFileSync(`${outputDir}/${pageNumber}.txt`, ' ', { encoding: 'utf-8' });
								} else if (symbol.property?.type === 'EOL_SURE_SPACE') {
								} else if (symbol.property?.type === 'SURE_SPACE') {
								}
							}
						}
						fs.appendFileSync(`${outputDir}/${pageNumber}.txt`, '\n', { encoding: 'utf-8' });
						log(`page ${pageNumber} paragraph ${++paragraphNum} parsed`, 'info');
					}
				}
			}
			log(`page ${pageNumber} parsed`, 'info');
		}
	}));
}

(async () => {
	validateKeystore();

	// 上传pdf文件到 gs://language-tool/th/books/${filename}
	const storage = new Storage();
	const bucket = await getBucket(storage);
	const [file, metadata] = await upload(bucket, filepath, (p) => {
		log(`${filepath} uploading --> ${p.bytesWritten} bytes uploaded`, 'info');
	});

	// 使用GCP OCR API识别，将结果保存在gs://language-tool/th/books/${filename}_result/
	const sourceUri = `gs://language-tool/${file.name}`;
	const destinationUri = `gs://language-tool/${file.name}_result/`;
	const destination = await ocr(sourceUri, destinationUri);

	// 拉取识别结果，解析paragraphs中的text
	await parsePages(bucket, `${file.name}_result/`);

	// 使用GCP NLP API，进行语法分析，自动断句
	if (!merge) return;
	const list = fs.readdirSync(outputDir).filter(v => v.endsWith('.txt') && v !== 'total.txt').sort((a, b) => parseInt(a.split('.')[0]) - parseInt(b.split('.')[0]));
	fs.writeFileSync(`${outputDir}/total.txt`, '', { encoding: 'utf-8' });
	for (const item of list) {
		log(`${outputDir}/${item} merging...`, 'info');
		const txt = fs.readFileSync(`${outputDir}/${item}`, { encoding: 'utf-8' });
		fs.appendFileSync(`${outputDir}/total.txt`, txt, { encoding: 'utf-8'});
	}
})();