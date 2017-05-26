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
  const exists = (target : string) =>
    fs.existsSync(path.join(process.cwd(), target))

  if (exists("coverage") ||
      exists("test") ||
      exists("spec")) {
    return (inquirer as any).prompt([
      {
        default: true,
        message: "Looks like you have tests. Install plugin?",
        name: "ok_to_add",
        type: "confirm"
      }
    ]).then((answers : any) => {
      if (answers.ok_to_add) {
        const cov_map = _.get(plugin_map.frameworks, "coverage")
        _.each(cov_map, (plugin : string) =>
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
