import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const convertToLegacyConfig = (entry) => {
  if (Array.isArray(entry)) {
    if (entry.length === 1) {
      return convertToLegacyConfig(entry[0])
    }
    return entry.map((item) => convertToLegacyConfig(item))
  }
  if (entry && typeof entry === "object") {
    const legacy = {}
    if (entry.plugins && typeof entry.plugins === "object" && !Array.isArray(entry.plugins)) {
      legacy.plugins = Object.keys(entry.plugins)
    } else if (Array.isArray(entry.plugins)) {
      legacy.plugins = entry.plugins
    }
    if (entry.rules) {
      legacy.rules = entry.rules
    }
    if (entry.settings) {
      legacy.settings = entry.settings
    }
    if (entry.languageOptions?.parserOptions) {
      legacy.parserOptions = entry.languageOptions.parserOptions
    }
    if (entry.languageOptions?.globals) {
      legacy.globals = entry.languageOptions.globals
    }
    if (entry.languageOptions?.parser) {
      legacy.parser = entry.languageOptions.parser
    }
    if (entry.extends) {
      legacy.extends = entry.extends
    }
    return legacy
  }
  return entry
}

if (reactHooksPlugin && typeof reactHooksPlugin === "object" && reactHooksPlugin.configs) {
  Object.entries(reactHooksPlugin.configs).forEach(([name, cfg]) => {
    reactHooksPlugin.configs[name] = convertToLegacyConfig(cfg)
  })
}

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const baseConfigs = compat.extends("next/core-web-vitals", "next/typescript").map((config) => {
  if (Array.isArray(config.extends)) {
    config = {
      ...config,
      extends: config.extends.filter(
        (item) => item !== "plugin:react-hooks/recommended" && item !== "plugin:react-hooks/recommended-latest",
      ),
    }
  }
  return config
})

const eslintConfig = [
  ...baseConfigs,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...(reactHooksPlugin.configs?.recommended?.rules ?? {}),
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "lib/generated/**",
      "types/**",
    ],
  },
]

export default eslintConfig
