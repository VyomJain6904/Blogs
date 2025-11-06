import type Keys from "../locales/keys";

interface Configuration {
    title: string;
    subTitle: string;
    description: string;
    site: string;
    locale: "en";
    navigators: { nameKey: Keys; href: string }[];
    username: string;
    sign: string;
    avatarUrl: string;
    socialLinks: { icon: string; link: string }[];
    maxFooterCategoryChip: number;
    maxFooterTagChip: number;
    banners: string[];
    slugMode: "HASH" | "RAW";
    bannerStyle: "LOOP";
}

export type { Configuration };
