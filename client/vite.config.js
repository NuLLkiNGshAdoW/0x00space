import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const VERIFICATION_META = {
  VITE_GOOGLE_SITE_VERIFICATION: "google-site-verification",
  VITE_YANDEX_VERIFICATION: "yandex-verification",
  VITE_BING_SITE_VERIFICATION: "msvalidate.01",
};

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function seoVerificationPlugin(env) {
  const siteUrl = (env.VITE_SITE_URL || "https://0x00space.vercel.app").replace(/\/+$/, "");
  return {
    name: "seo-verification-meta",
    transformIndexHtml(html) {
      let result = html.replaceAll("https://0x00space.vercel.app", siteUrl);
      const tags = Object.entries(VERIFICATION_META)
        .filter(([envKey]) => env[envKey])
        .map(
          ([envKey, metaName]) =>
            `    <meta name="${metaName}" content="${escapeAttribute(env[envKey])}" />`,
        );
      if (tags.length) result = result.replace("</head>", `${tags.join("\n")}\n  </head>`);
      return result;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), seoVerificationPlugin(env)],
    server: {
      port: 5173,
    },
  };
});
