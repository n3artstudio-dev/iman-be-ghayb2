import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "بالغیب — سامانهٔ تعاملی ایمان به غیب",
    short_name: "بالغیب",
    description: "پیام‌رسان با وجدان الهی، وضعیت، سینمای آیات، مسابقه و سفر سینمایی — قرآن سینماتیک",
    start_url: "/chat",
    display: "standalone",
    background_color: "#03040b",
    theme_color: "#03040b",
    dir: "rtl",
    lang: "fa",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
