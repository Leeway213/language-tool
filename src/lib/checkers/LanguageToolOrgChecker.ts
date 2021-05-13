import { ILanguageChecker, ILanguageElement } from "../interfaces";
import { BrowserDaemon } from "../browser";
import { Page, errors } from "puppeteer";

export class LanguageToolOrgChecker implements ILanguageChecker {
  translate(txt: string, language: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  readonly LANGUAGE_TOOL_ORG = 'https://languagetool.org/';

  errors: {
    [key: string]: {
      content: string,
      errorType: string,
      errorMessage: string,
    }[]
  } = {};

  private page?: Page;
  private languages: ILanguageElement[] = [];

  async supportLanguages(): Promise<ILanguageElement[]> {
    this.page = await BrowserDaemon.instance.open(this.LANGUAGE_TOOL_ORG).toPromise();

    const el = await this.page.$('.dk_toggle');
    if (el) {
      await el.click();
      const optsEl = await this.page.$('.dk_options');
      if (optsEl) {
        const opts = await optsEl.$$('a');
        for (const opt of opts) {
          const id: string = await this.page.evaluate(el => el.innerText, opt);
          this.languages.push({
            id,
            select: () => el.click().then(() => opt.click()),
          });
        }
      }
      await el.click();
    }

    return this.languages;
  }

  async check(txt: string, language: string) {
    if (this.languages.length === 0) {
      await this.supportLanguages();
    }

    let page: Page;
    if (this.page) {
      page = this.page
    } else {
      page = await BrowserDaemon.instance.open(this.LANGUAGE_TOOL_ORG).toPromise();
    }
    const lan = this.languages.find(v => v.id === language || v.alias === language);
    if (lan) {

    } else {
      throw new Error(`\nError: Supported language:\n${this.languages.map(v => `${v.id}, ${v.alias || ''}`).join('\n')}`);
    }
    const label = await this.getInnerText('.dk_label', page);
    if (label !== language) {
      const el = await page.$('.dk_toggle');
      if (el) {
        el.click();
      }

      const optsEl = await page.$('.dk_options');
      if (optsEl) {
        const opts = await optsEl.$$('a');
        for (const opt of opts) {
          const innerText: string = await page.evaluate(el => el.innerText, opt);
          if (innerText === language) {
            await opt.click();
            break;
          }
        }
      }
    }

    await this.inputText(page, txt);
    const checkBtn = await page.$('button[name="_action_checkText"]');
    if (checkBtn) {
      await checkBtn.click();
    }
    await this.waitForResult(page);
    this.errors[txt] = await this.getCheckResult(page);
    return this.errors[txt] && this.errors[txt].length > 0;
  }

  private async waitForResult(page: Page) {
    while (true) {
      const blocker = await page.$('#checktext_blocker');
      if (!blocker) {
        const errorMessage = await page.$('#feedbackErrorMessage');
        if (errorMessage) {
          const message = await page.evaluate(el => el.innerText, errorMessage);
          if (message) {
            throw new Error(message);
          }
        }
        break;
      }
    }
  }

  private async getCheckResult(page: Page) {
    let errors: {
      content: string,
      errorType: string,
      errorMessage: string,
    }[] = [];
    const iframe = await page.$('#checktext_ifr');
    if (iframe) {
      errors = await page.evaluate((el) => {
        const body = el.contentWindow.document.getElementById('tinymce');
        let p = body.querySelector('p');
        if (!p) {
          throw new Error('text input is empty');
        } else {
          var errors: {
            content: string,
            errorType: string,
            errorMessage: string,
          }[] = [];
          for (let i = 0; i < p.children.length; i++) {
            const child = p.children[i];
            const error = {
              content: child.innerText,
              errorType: child.getAttribute('class'),
              errorMessage: child.getAttribute('onkeypress'),
            }
            errors.push(error);
          }
          return errors;
        }
      }, iframe);
    }
    return errors;
  }

  private async inputText(page: Page, text: string) {
    const iframe = await page.$('#checktext_ifr');
    if (iframe) {
      await page.evaluate((el, text) => {
        const body = el.contentWindow.document.getElementById('tinymce');
        let p = body.querySelector('p');
        if (!p) {
          p = document.createElement('p');
          body.appendChild(p);
        }
        p.innerText = text;
      }, iframe, text);
    }
  }

  private async getInnerText(selector: string, page: Page) {
    const el = await page.$(selector);
    if (el) {
      const innerText: string = await page.evaluate(el => el.innerText, el);
      return innerText;
    }
  }
}

// new LanguageToolOrgDetector().check('Sverigedemokraternas sympatisörer är dramatisktmycket mer negativa till utländska inslag i samhället, invandrares religionsfrihetoch till familjemedlemmar med ursprung utanför Sverige än alla de parlamentariskapartiers.', 'Swedish').then(() => process.exit());
