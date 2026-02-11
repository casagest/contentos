import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ["src/app/dashboard/business/page.tsx"],
    rules: {
      "react-hooks/static-components": "off", // DynamicIcon: lookup from ICON_MAP, not creation
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
    ".next/cache/**",
    "e2e/**",
    "playwright.config.ts",
    "test-results/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
