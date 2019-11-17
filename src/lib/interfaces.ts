import { Observable } from "rxjs";

export interface ILanguageChecker {
  check(txt: string, language: string): any;
}
