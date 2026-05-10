/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // new feature
        'fix',      // bug fix
        'docs',     // documentation only
        'style',    // formatting, no logic change
        'refactor', // code change that neither fixes bug nor adds feature
        'perf',     // performance improvement
        'test',     // adding or updating tests
        'chore',    // build process, tooling, dependency updates
        'revert',   // reverts a previous commit
        'ci',       // CI/CD configuration changes
        'build',    // build system changes
        'wip',      // work in progress (never merge to main)
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'pos',      // Tauri POS app
        'admin',    // Next.js admin dashboard
        'api',      // NestJS backend API
        'shared',   // packages/shared
        'db-local', // packages/db-local
        'db-cloud', // packages/db-cloud
        'sync',     // packages/sync
        'ui',       // packages/ui
        'config',   // packages/config
        'infra',    // Docker, CI/CD
        'deps',     // dependency updates
        'spec',     // specification documents
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};