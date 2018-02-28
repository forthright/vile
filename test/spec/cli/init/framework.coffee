fs = require "fs"
path = require "path"
Bluebird = require "bluebird"
mimus = require "mimus"
inquirer = require "inquirer"
chai = require "./../../../helpers/sinon_chai"
map = require "./../../../../lib/cli/init/map"
framework = mimus.require(
  "./../../../../lib/cli/init/framework", __dirname, [])
map = require "./../../../../lib/cli/init/map"
promise_stub = undefined
config = ferret: plugins: []
expect = chai.expect

describe "cli/init/framework", ->
  before ->
    promise_stub = { then: mimus.stub() }
    mimus.stub fs, "existsSync"
    mimus.stub fs, "readFileSync"
    mimus.stub inquirer, "prompt"
    fs.readFileSync.returns new Buffer ""

  beforeEach ->
    promise_stub.then.returns promise_stub
    config.ferret.plugins = []

  after -> mimus.restore()

  afterEach -> mimus.reset()

  describe ".init", ->
    describe "without test dirs", ->
      beforeEach ->
        fs.existsSync.returns false
        fs.readFileSync.returns new Buffer("")
        inquirer.prompt.returns new Bluebird (resolve, reject) ->
          resolve { frameworks: [] }

      it "does nothing and passes back the config", ->
        framework.init(config).should.eventually.eql {
          ferret: { plugins: [] }
        }

    describe "when config.ru seems to have Rails in it", ->
      beforeEach ->
        inquirer.prompt.returns new Bluebird (resolve, reject) ->
          resolve { frameworks: [ "rails" ] }
        fs.existsSync
          .withArgs "config.ru"
          .returns true
        fs.readFileSync
          .withArgs "config.ru"
          .returns new Buffer("a = 2\nRails.env")

      it "adds rails specific plugins to config", ->
        framework.init(config).should.eventually.eql {
          ferret: {
            plugins: map.frameworks.rails
          }
        }

    [
      [ "coffeelint.json", "coffeelint" ]
      [ ".sass-lint.yml",  "sass_lint" ]
      [ ".rubocop.yml",    "rubocop" ]
      [ ".slim-lint.yml",  "slim_lint" ]
      [ ".brakeman.yml",   "brakeman" ]
      [ ".git",            "git" ]
      [ ".jshintrc",       "jshint" ]
      [ ".jshintignore",   "jshint" ]
      [ ".eslintrc",       "eslint" ]
      [ ".eslintrc.yml",   "eslint" ]
      [ ".eslintrc.yaml",  "eslint" ]
      [ ".eslintrc.json",  "eslint" ]
      [ ".eslintrc.js",    "eslint" ]
      [ ".retireignore",   "retirejs" ]
      [ ".editorconfig",   "editorconfig" ]
      [ "node_modules",    "nodejs" ]
      [ "package.json",    "nodejs" ]
      [ "bower.json",      "bower" ]
      [ "Gemfile",         "bundler" ]
    ].forEach (fixture) ->
      [ target, ctx ] = fixture

      describe ctx, ->
        beforeEach ->
          inquirer.prompt.returns new Bluebird (resolve, reject) ->
            resolve { frameworks: [ ctx ] }
          fs.existsSync
            .returns false
          fs.existsSync
            .withArgs target
            .returns true

        it "adds plugins for #{target}", ->
          framework.init(config).should.eventually.eql {
            ferret: {
              plugins: map.frameworks[ctx]
            }
          }
