// TODO: write framework detector lib

const frameworks = {
  bower: [ "constable" ],
  brakeman: [ "brakeman" ],
  bundler: [ "bundler-outdated", "bundler-audit" ],
  coffeelint: [ "coffeelint" ],
  editorconfig: [ "eclint" ],
  eslint: [ "eslint" ],
  git: [ "git" ],
  jshint: [ "jshint" ],
  nodejs: [ "nsp" ],
  rails: [ "brakeman", "rails-best-practices" ],
  retirejs: [ "retire" ],
  rubocop: [ "rubocop" ],
  sass_lint: ["sass-lint" ],
  slim_lint: [ "slim-lint" ],
  tslint: [ "tslint" ]
}

const langs = {
  // coffeescript: [ "coffeelint" ], TODO: requires config file present
  haskell: [ "hlint" ],
  // php: [ "phpmd" ], TODO: has a complex peer install
  ruby: [ "rubocop" ],
  sass: [ "sass-lint" ],
  scss: [ "sass-lint" ],
  slim: [ "slim-lint" ]
  // typescript: [ "tslint" ] TODO: tslint requires config file present
}

const peer = {
  "brakeman": { gem: "brakeman" },
  "bundler-audit": { gem: [ "bundler", "bundler-audit" ] },
  "bundler-outdated": { gem: "bundler" },
  "hlint": { cabal: "hlint" },
  "rails-best-practices": { gem: "rails_best_practices" },
  "retire": { npm: "retire" },
  "rubocop": { gem: "rubocop" },
  "slim-lint": { gem: "slim_lint" }
}

const DEFAULT_IGNORE_DIRS : string[] = [
  "app/assets/images",
  "app/assets/videos",
  "bin",
  "bower_components",
  ".bundle",
  "cabal.sandbox.config",
  ".cabal-sandbox",
  "coverage",
  "db",
  "doc",
  "dist",
  ".git",
  ".gitmodules",
  ".gitattributes",
  "log",
  "node_modules",
  ".nyc_output",
  "tmp",
  "tags",
  "vendor"
]

const PLUGIN_MAP : vile.PluginMap = {
  frameworks,
  ignore: DEFAULT_IGNORE_DIRS,
  langs,
  peer
}

export = PLUGIN_MAP
