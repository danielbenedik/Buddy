/** ESLint config: React + TS + Prettier (opinionated) */
module.exports = {
  root: true,
  env: { browser: true, es2023: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
    project: ["./tsconfig.json"],
  },
  plugins: [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "jsx-a11y",
    "import",
    "prettier",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "plugin:prettier/recommended", // מפעיל גם כלל "prettier/prettier"
    "prettier",
  ],
  settings: { react: { version: "detect" } },
  rules: {
    /** ניקיון בסיסי */
    "no-trailing-spaces": "error",
    "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }], // ← מקסימום שורה ריקה אחת
    "eol-last": ["error", "always"],

    /** יבואי מודולים */
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "object",
          "type",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-duplicates": "warn",

    /** React/TS הרגלים טובים */
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off", // React 17+
    "react/prop-types": "off", // משתמשים ב-TS
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      { prefer: "type-imports" },
    ],

    /** Prettier כבדיקת פורמט */
    "prettier/prettier": "error",
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      rules: {
        "no-undef": "off", // TS כבר מטפל בזה
      },
    },
    {
      files: ["*.js", "*.jsx", "*.cjs", "*.mjs"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    {
      files: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
      env: { jest: true },
    },
  ],
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    "*.config.js",
    "*.config.cjs",
  ],
};
