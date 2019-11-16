import { ILanguageChecker } from "../interfaces";

export class LanguageToolOrgDetector implements ILanguageChecker {
  check(txt: string, language: string): string {
    throw new Error("Method not implemented.");
  }
}
