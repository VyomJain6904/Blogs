import Keys from "./src/locales/keys";
import type { Configuration } from "./src/types/config";

const WriteupsConfig: Configuration = {
    title: "G€€k !urk",
    subTitle: "Security Writeups and Notes",

    description:
        "Security Writeups and Notes",

    site: "https://geeklurk.vercel.app",

    locale: "en",

    navigators: [
        {
            nameKey: Keys.nav_bar_home,
            href: "/",
        },
        {
            nameKey: Keys.nav_bar_writeups,
            href: "/writeups",
        },
        {
            nameKey: Keys.nav_bar_about,
            href: "/about",
        },
    ],

    username: "G€€k !urk",
    sign: "Security Engineer",
    avatarUrl: "./assets/avatar.jpg",
    socialLinks: [
        {
            icon: "line-md:github-loop",
            link: "https://github.com/VyomJain6904",
        },
    ],

    banners: [
        "./assets/banner1.jpg",
        "./assets/banner3.png",
        "./assets/banner7.png",
        "./assets/banner8.png",
    ],

    slugMode: "HASH",
    bannerStyle: "LOOP",

    adminEnabled: true,
    adminUsername: "g€€k!urk",
    adminPassword: process.env.ADMIN_PASSWORD,
};

export default WriteupsConfig;
