import fs = require("fs")
import path = require("path")
import Bluebird = require("bluebird")
import inquirer = require("inquirer")
import _ = require("lodash")
import plugin_map = require("./map")

// TODO: be more in depth, vs generically suggesting coverage plugin
const check_for_test_coverage_step = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> => {
  let exists = (target : string) =>
    fs.existsSync(path.join(process.cwd(), target))

  if (exists("coverage") ||
      exists("test") ||
      exists("spec")) {
    return (<any>inquirer).prompt([
      {
        type: "confirm",
        name: "ok_to_add",
        message: "Looks like you have tests. Install plugin?",
        default: true
      }
    ]).then((answers : any) => {
      if (answers.ok_to_add) {
        _.each(plugin_map.frameworks["coverage"], (plugin : string) =>
          config.vile.plugins.push(plugin))
      }

      return Bluebird.resolve(config)
    })
  } else {
    return Bluebird.resolve(config)
  }
}

export = {
  init: check_for_test_coverage_step
}
