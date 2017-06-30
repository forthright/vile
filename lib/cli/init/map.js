"use strict";
var frameworks = {
    bower: ["constable"],
    brakeman: ["brakeman"],
    bundler: ["bundler-outdated", "bundler-audit"],
    coffeelint: ["coffeelint"],
    core: ["stat"],
    coverage: ["coverage"],
    editorconfig: ["eclint"],
    eslint: ["eslint"],
    git: ["git"],
    jshint: ["jshint"],
    nodejs: ["retire", "ncu"],
    rails: ["brakeman", "rails-best-practices"],
    retirejs: ["retire"],
    rubocop: ["rubocop"],
    sass_lint: ["sass-lint"],
    slim_lint: ["slim-lint"]
};
var langs = {
    coffeescript: ["coffeelint"],
    haskell: ["hlint"],
    javascript: ["escomplex"],
    php: ["phpmd"],
    ruby: ["rubocop", "rubycritic"],
    sass: ["sass-lint"],
    scss: ["scss-lint"],
    slim: ["slim-lint"],
    typescript: ["tslint"]
};
var peer = {
    "brakeman": { gem: "brakeman" },
    "bundler-audit": { gem: ["bundler", "bundler-audit"] },
    "bundler-outdated": { gem: "bundler" },
    "hlint": { cabal: "hlint" },
    "ncu": { npm: "npm-check-updates" },
    "rails-best-practices": { gem: "rails_best_practices" },
    "retire": { npm: "retire" },
    "rubocop": { gem: "rubocop" },
    "sass-lint": { npm: "sass-lint" },
    "scss-lint": { gem: "scss_lint" },
    "slim-lint": { gem: "slim_lint" }
};
var PLUGIN_MAP = {
    frameworks: frameworks,
    langs: langs,
    peer: peer
};
module.exports = PLUGIN_MAP;
