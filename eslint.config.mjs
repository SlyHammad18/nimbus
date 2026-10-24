// ESLint flat configuration for SyStats.
// Encodes the GNOME extension-review essentials (DESIGN.md N9, AGENTS.md §4)
// by hand: eslint-plugin-gjs 1.0.4 deep-imports eslint/lib/ast-utils, which is
// no longer exported in ESLint 9+, so the small set of gjs bans that are
// mechanically checkable is reproduced here as core rules.

export default [
  {
    ignores: ['build/**', 'builddir/**', 'node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      // GNOME extensions review hard rules
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-unused-vars': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: 'error',
      camelcase: 'error',

      // Legacy-API bans (replaces eslint-plugin-gjs/no-legacy-*)
      // imports/imports came from legacy GJS: caught at review time; the
      // machine-checkable proxy is banning the legacy module ids outright.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['imports', 'utils'], message: 'legacy GJS API, use GI imports (GNOME 45+ ESM)' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'imports', message: 'legacy GJS global, use GI ESM imports' },
        { name: 'Lang', message: 'legacy Lang.bind, use native class field arrows' },
        { name: 'Mainloop', message: 'legacy Mainloop, use GLib.timeout_add' },
      ],
    },
  },
];
