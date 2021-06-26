import { ILanguageTranslater } from "../interfaces";
import { KEYSTORE_FILE } from '../../constants';
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEYSTORE_FILE;

import { v2 } from '@google-cloud/translate';

export class GoogleTranslater implements ILanguageTranslater {
	private client = new v2.Translate();
	async translate(txt: string, from: string, to: string): Promise<string> {
		const [translations] = await this.client.translate(txt, {
			from,
			to
		});
		return translations;
	}

	async batchTranslate(txt: string[], from: string, to: string): Promise<string[]> {
		const [translations] = await this.client.translate(txt, {from, to});
		return translations;
	}
}
