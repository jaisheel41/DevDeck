/** @type {import('next').NextConfig} */
const staticExport = process.env.DEVDECK_STATIC_EXPORT === "1";

const nextConfig = {
  transpilePackages: ["@jaisheel1/devdeck-shared"],
  env: staticExport ? { NEXT_PUBLIC_DEVDECK_EMBEDDED: "1" } : {},
  ...(staticExport
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {}),
};

module.exports = nextConfig;
