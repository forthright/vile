/// <reference path="../../@types/index" />

import fs = require("fs")
import path = require("path")
import inquirer = require("inquirer")
import Bluebird = require("bluebird")

const welcome_confirm = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> =>
  (<any>inquirer).prompt([
    {
      type: "confirm",
      name: "ok_to_proceed",
      message: "Hello friend. Please follow the prompts and " +
        "answer as best you can.",
      default: true
    }
  ]).then((answers : any) => {
    if (answers.ok_to_proceed) {
      return Bluebird.resolve(config)
    } else {
      return Bluebird.resolve(process.exit(0))
    }
  })

const check_for_existing_config = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> => {
  let vile_yml_path = path.join(process.cwd(), ".vile.yml")

  if (fs.existsSync(vile_yml_path)) {
    return (<any>inquirer).prompt([
      {
        type: "confirm",
        name: "ok_to_overwrite",
        message: "Found an existing .vile.yml. OK to overwrite?",
        default: true
      }
    ]).then((answers : any) => {
      if (answers.ok_to_overwrite) {
        return Bluebird.resolve(config)
      } else {
        return Bluebird.resolve(process.exit(0))
      }
    })
  } else {
    return Bluebird.resolve(config)
  }
}

const check_for_existing_package_json = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> => {
  let pkg_json_path = path.join(process.cwd(), "package.json")

  if (fs.existsSync(pkg_json_path)) return Bluebird.resolve(config)

  let pkg_json_shell = {
    private: true,
    name: "vile-project-dependency-config",
    scripts: {
      "vile-publish": "vile p -u project_name -si --nodecorations"
    },
    description: "Run `npm install` in a freshly cloned " +
      "project to install vile. This does not include non-npm " +
      "based peer dependency requirements. See plugin readme(s) for details."
  }

  let file_data = new Buffer(JSON.stringify(pkg_json_shell, null, "  "))

  return (<any>fs).writeFileAsync(pkg_json_path, file_data)
    .then((err : NodeJS.ErrnoException) => {
      return err ?
        Bluebird.reject(err) :
        Bluebird.resolve(config)
    })
}

export = {
  init: (config : vile.YMLConfig) =>
    welcome_confirm(config)
    .then(check_for_existing_config)
    .then(check_for_existing_package_json)
}
