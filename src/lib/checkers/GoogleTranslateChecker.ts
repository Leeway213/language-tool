import { ILanguageChecker, ILanguageElement } from "../interfaces";
import { BrowserDaemon } from "../browser";
import { ElementHandle, Page } from "puppeteer";

export class GoogleTranslateChecker implements ILanguageChecker {
  readonly GOOGLE_TRANSLATE_URL = 'https://translate.google.cn/#view=home&op=translate&tl=zh-CN';

  languages: ILanguageElement[] = [];

  private page?: Page;
  async supportLanguages(): Promise<ILanguageElement[]> {
    this.page = await BrowserDaemon.instance.open(this.GOOGLE_TRANSLATE_URL).toPromise();
    const page = this.page;

    const slToggle = await page.$('.tlid-open-source-language-list');
    if (slToggle) {
      await slToggle.click();
    }

    const slListEl = await page.$('.language-list-unfiltered-langs-sl_list');
    if (slListEl) {
      const allLanguageEl = (await slListEl.$$('.language_list_section'))[1];
      if (allLanguageEl) {
        const sections = await allLanguageEl.$$('.language_list_item_wrapper');
        if (sections) {
          for (const section of sections) {
            const alias = await section.evaluate((el: any) => el.innerText.trim());
            const id = await section.evaluate(el => el.classList[1].replace('language_list_item_wrapper-', ''));
            this.languages.push({
              id,
              alias,
              select: () => page.goto(`${this.GOOGLE_TRANSLATE_URL}&sl=${id}`),
            });
          }
        }
      }
    }
    if (slToggle) {
      await slToggle.click();
    }
    return this.languages;
  }
  async check(txt: string, language: string): Promise<boolean> {
    let hasError = false;
    if (this.languages.length === 0) {
      await this.supportLanguages();
    }
    const lan = this.languages.find(v => v.id === language || v.alias === language);
    if (lan) {
      const url = `${this.GOOGLE_TRANSLATE_URL}&sl=${lan.id}`;
      if (this.page) {
        await this.page.goto(url);
      } else {
        this.page = await BrowserDaemon.instance.newPage(`${this.GOOGLE_TRANSLATE_URL}&sl=${lan.id}`).toPromise();
      }

      const source = await this.page.$('#source');
      if (source) {
        await source.type(txt);

        let loop = true;
        const timer = setTimeout(() => {
          throw new Error('checking timeout, please check your network');
        }, 10000);
        while(loop) {
          const ele = await this.page.$('.tlid-translation.translation');
          if (ele) {
            clearTimeout(timer);
            break;
          }
        }
        const spellingCorrection = await this.page.$('#spelling-correction');
        if (spellingCorrection) {
          hasError = await spellingCorrection.evaluate((el: any) => el.style.display !== 'none');
        }
      }

      return hasError;
    } else {
      throw new Error(`\nError: Supported language:\n${this.languages.map(v => `${v.id}, ${v.alias || ''}`).join('\n')}`);
    }
  }
}



