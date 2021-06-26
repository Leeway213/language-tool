import { Observable } from "rxjs";
import { ElementHandle } from "puppeteer";

export interface ILanguageElement {
  id: string;
  alias?: string;
  select?: () => any | Promise<any> | Observable<any>;
}
export interface ILanguageChecker {
  supportLanguages(): ILanguageElement[] | Promise<ILanguageElement[]> | Observable<ILanguageElement[]>;
  check(txt: string, language: string): boolean | Promise<boolean> | Observable<boolean>;
}

export interface ILanguageTranslater {
  translate(txt: string, from: string, to: string): Promise<string>;
  batchTranslate?: (txt: string[], from: string, to: string) => Promise<string[]>;
}
