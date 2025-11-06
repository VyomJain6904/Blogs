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
    banners: string[];
    slugMode: "HASH" | "RAW";
    bannerStyle: "LOOP";
    adminEnabled?: boolean;
    adminUsername?: string;
    adminPassword?: string;
}

export type { Configuration };
