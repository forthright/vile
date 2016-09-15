/// <reference path="../lib/typings/index.d.ts" />

var plugin_map = require("./init/map")
var pre = require("./init/pre")
var language = require("./init/language")
var framework = require("./init/framework")
var ignore = require("./init/ignore")
var coverage = require("./init/coverage")
var post = require("./init/post")

var vile_config_base = () : Vile.YMLConfig => {
  return {
    vile: {
      ignore: [],
      allow: [],
      plugins: plugin_map.frameworks.core
    }
  }
}

var initialize_vile_project = (
  cli : Commander.CLI
) : bluebird.Promise<Vile.YMLConfig> =>
  pre.init(vile_config_base())
    .then(ignore.init)
    .then(language.init)
    .then(framework.init)
    .then(coverage.init)
    .then(post.init)

var create = (cli : any) =>
  cli
    .command("init")
    .alias("i")
    .action(initialize_vile_project)

module.exports = {
  create: create
}
