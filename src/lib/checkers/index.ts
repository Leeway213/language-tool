import { GoogleTranslateChecker } from "./GoogleTranslateChecker";
import { LanguageToolOrgChecker } from "./LanguageToolOrgChecker";
import { ILanguageChecker } from "../interfaces";

export const checkers: { [key: string]: ILanguageChecker } = {
  'google': new GoogleTranslateChecker(),
  'languagetoolorg': new LanguageToolOrgChecker(),
};
