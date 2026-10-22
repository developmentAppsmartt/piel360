// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { reglaMaxLineas } from '../../packages/config/eslint.max-lines.mjs';

/** Deuda del día que entró `max-lines`: esta lista solo puede encoger. */
const ARCHIVOS_LARGOS_HEREDADOS = [
  "src/agenda/agenda.service.ts",
  "src/analyses/analyses.service.ts",
  "src/auth/auth.service.ts",
  "src/auth/recaptcha.service.ts",
  "src/billing/billing.service.ts",
  "src/doctor-reports/doctor-reports.queries.ts",
  "src/doctors/doctors.service.ts",
  "src/email-templates/email-templates.service.ts",
  "src/fitzpatrick-rules/fitzpatrick-rules.service.ts",
  "src/messages/messages.service.ts",
  "src/organizations/organizations.service.ts",
  "src/patients/patients.service.ts",
  "src/reports/report-pdf.service.ts",
  "src/routines/routines.service.ts",
  "src/skin-age-rules/skin-age-rules.service.ts",
  "src/subscriptions/subscriptions.service.ts",
];

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...reglaMaxLineas(ARCHIVOS_LARGOS_HEREDADOS),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
);
