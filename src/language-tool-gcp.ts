import commander from "commander";
import fs from 'fs';
import { KEYSTORE_PATH, KEYSTORE_FILE } from './constants';

commander.usage('<json file>')
commander.parse(process.argv);

let filepath = commander.args && commander.args[0];

if (!filepath) {
	commander.help();
	process.exit(0);
}


(async () => {
	const keystore = fs.readFileSync(filepath, { encoding: 'utf-8' });
	if (!fs.existsSync(KEYSTORE_PATH)) {
		fs.mkdirSync(KEYSTORE_PATH);
	}
	fs.writeFileSync(KEYSTORE_FILE, keystore, { encoding: 'utf-8' });
})();