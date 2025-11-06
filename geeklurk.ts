import Keys from "./src/locales/keys";
import type { Configuration } from "./src/types/config";

const WriteupsConfig : Configuration = {
    title: "g€€k !urk",
    subTitle: "",

    description: "writeups about security",

    site: "https://yukina-blog.vercel.app",

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
            nameKey: Keys.nav_bar_github,
            href: "https://github.com/VyomJain6904",
        },
    ],

    username: "g€€k !urk",
    sign: "Security Engineer",
    avatarUrl: "./assets/avatar.jpg",
    socialLinks: [
        {
            icon: "line-md:github-loop",
            link: "https://github.com/VyomJain6904",
        },
    ],

    maxFooterCategoryChip: 6,
    maxFooterTagChip: 24,

    banners: [
        "./assets/banner1.jpg",
        "./assets/banner2.jpg",
        "./assets/banner3.png",
        "./assets/banner4.jpg",
        "./assets/banner5.jpg",
        "./assets/banner6.jpg",
        "./assets/banner7.png",
        "./assets/banner8.png",
    ],

    slugMode: "HASH",

    bannerStyle: "LOOP",
};

export default WriteupsConfig;
