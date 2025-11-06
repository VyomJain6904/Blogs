import WriteupsConfig from "../../geeklurk";
import type Keys from "./keys";
import { en } from "./languages/en";

export type Translation = {
    [K in Keys]: string;
};

const map: { [key: string]: Translation } = {
    en: en,
};

export function getTranslation(lang: string): Translation {
    return map[lang.toLowerCase()] || en;
}

export function locallang(key : Keys, ...interpolations: string[]): string {
    const lang = WriteupsConfig.locale;
    let translation = getTranslation(lang)[key];
    interpolations.forEach((interpolation) => {
        translation = translation.replace("{{}}", interpolation);
    });
    return translation;
}
