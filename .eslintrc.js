module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: "detect",
    },
    "import/ignore": ["node_modules", "\\.(coffee|scss|css|less|json)$"],
  },
  plugins: ["@typescript-eslint", "react", "react-native", "import", "prettier", "unused-imports"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-ignore": "allow-with-description",
        minimumDescriptionLength: 10,
      },
    ],
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "variable",
        format: ["camelCase", "PascalCase", "UPPER_CASE", "snake_case"],
        leadingUnderscore: "allow",
      },
      {
        selector: "function",
        format: ["camelCase", "PascalCase"],
        leadingUnderscore: "allow",
      },
      {
        selector: "typeLike",
        format: ["PascalCase"],
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "LogicalExpression[operator='||'][left.type='MemberExpression'][left.object.type='MemberExpression'][left.object.object.name='process'][left.object.property.name='env']",
        message:
          "Unsafe env fallback pattern 'process.env.X || \"default\"' is discouraged. Use a proper env validation or fail-fast approach.",
      },
    ],
    "react/react-in-jsx-scope": "off", // Not needed for newer React versions
    "react-native/no-inline-styles": "warn",
    "react-native/no-color-literals": "off",
    "react-native/sort-styles": "off",
    "@typescript-eslint/no-require-imports": "off", // Common for local assets in RN
  },
};
