/// <reference path="../../lib/typings/index.d.ts" />

var fs = require("fs")
var path = require("path")
var Bluebird : typeof bluebird.Promise = require("bluebird")
var inquirer = require("inquirer")
var _ = require("lodash")
var plugin_map = require("./map")

// TODO: be more in depth, vs generically suggesting coverage plugin
var check_for_test_coverage_step = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> => {
  let exists = (target : string) =>
    fs.existsSync(path.join(process.cwd(), target))

  if (exists("coverage") ||
      exists("test") ||
      exists("spec")) {
    return inquirer.prompt([
      {
        type: "confirm",
        name: "ok_to_add",
        message: "Looks like you have tests. Install plugin?",
        default: true
      }
    ]).then((answers : any) => {
      if (answers.ok_to_add) {
        _.each(plugin_map.frameworks.coverage, (plugin : string) =>
          config.vile.plugins.push(plugin))
      }

      return Bluebird.resolve(config)
    })
  } else {
    return Bluebird.resolve(config)
  }
}

module.exports = {
  init: check_for_test_coverage_step
}
