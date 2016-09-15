/// <reference path="../../lib/typings/index.d.ts" />

// TODO: write framework detector lib

const PLUGIN_MAP = {
  frameworks: {
    coverage: [ "coverage" ],
    rails: [ "brakeman", "rails-best-practices" ],
    nodejs: [ "retire", "ncu" ],
    bower: [ "constable" ],
    bundler: [ "bundler-outdated", "bundler-audit" ],
    editorconfig: [ "eclint" ],
    eslint: [ "eslint" ],
    jshint: [ "jshint" ],
    sass_lint: ["sass-lint" ],
    rubocop: [ "rubocop" ],
    slim_lint: [ "slim-lint" ],
    brakeman: [ "brakeman" ],
    coffeelint: [ "coffeelint" ],
    retirejs: [ "retire" ],
    git: [ "git" ],
    core: [ "language", "stat" ]
  },
  peer: {
    brakeman: { gem: "brakeman" },
    "rails-best-practices": { gem: "rails_best_practices" },
    ncu: { npm: "npm-check-updates" },
    hlint: { cabal: "hlint" },
    "bundler-outdated": { gem: "bundler" },
    "bundler-audit": { gem: [ "bundler", "bundler-audit" ] },
    "slim-lint": { gem: "slim_lint" },
    "sass-lint": { npm: "sass-lint" },
    "scss-lint": { gem: "scss_lint" },
    rubocop: { gem: "rubocop" },
    retire: { npm: "retire" }
  },
  langs: {
    ruby: [ "rubocop", "rubycritic" ],
    haskell: [ "hlint" ],
    sass: [ "sass-lint" ],
    scss: [ "scss-lint" ],
    slim: [ "slim-lint" ],
    typescript: [ "tslint" ],
    javascript: [ "eslint" ],
    php: [ "phpmd" ],
    coffeescript: [ "coffeelint" ]
  }
}

module.exports = PLUGIN_MAP
