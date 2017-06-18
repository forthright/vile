// TODO: write framework detector lib

const frameworks = {
  bower: [ "constable" ],
  brakeman: [ "brakeman" ],
  bundler: [ "bundler-outdated", "bundler-audit" ],
  coffeelint: [ "coffeelint" ],
  core: [ "language", "stat" ],
  coverage: [ "coverage" ],
  editorconfig: [ "eclint" ],
  eslint: [ "eslint" ],
  git: [ "git" ],
  jshint: [ "jshint" ],
  nodejs: [ "retire", "ncu" ],
  rails: [ "brakeman", "rails-best-practices" ],
  retirejs: [ "retire" ],
  rubocop: [ "rubocop" ],
  sass_lint: ["sass-lint" ],
  slim_lint: [ "slim-lint" ]
}

const langs = {
  coffeescript: [ "coffeelint" ],
  haskell: [ "hlint" ],
  javascript: [ "escomplex" ],
  php: [ "phpmd" ],
  ruby: [ "rubocop", "rubycritic" ],
  sass: [ "sass-lint" ],
  scss: [ "scss-lint" ],
  slim: [ "slim-lint" ],
  typescript: [ "tslint" ]
}

const peer = {
  "brakeman": { gem: "brakeman" },
  "bundler-audit": { gem: [ "bundler", "bundler-audit" ] },
  "bundler-outdated": { gem: "bundler" },
  "hlint": { cabal: "hlint" },
  "ncu": { npm: "npm-check-updates" },
  "rails-best-practices": { gem: "rails_best_practices" },
  "retire": { npm: "retire" },
  "rubocop": { gem: "rubocop" },
  "sass-lint": { npm: "sass-lint" },
  "scss-lint": { gem: "scss_lint" },
  "slim-lint": { gem: "slim_lint" }
}

const PLUGIN_MAP : vile.PluginMap = {
  frameworks,
  langs,
  peer
}

export = PLUGIN_MAP
