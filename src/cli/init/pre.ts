/// <reference path="../../lib/typings/index.d.ts" />

var fs = require("fs")
var path = require("path")
var inquirer = require("inquirer")
var Bluebird : typeof bluebird.Promise = require("bluebird")

var welcome_confirm = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> =>
  inquirer.prompt([
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
      process.exit(0)
    }
  })

var check_for_existing_config = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> => {
  let vile_yml_path = path.join(process.cwd(), ".vile.yml")

  if (fs.existsSync(vile_yml_path)) {
    return inquirer.prompt([
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
        process.exit(0)
      }
    })
  } else {
    return Bluebird.resolve(config)
  }
}

var check_for_existing_package_json = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> => {
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

  return fs.writeFileAsync(pkg_json_path, file_data)
    .then((err) => {
      return err ?
        Bluebird.reject(err) :
        Bluebird.resolve(config)
    })
}

module.exports = {
  init: (config : Vile.YMLConfig) =>
    welcome_confirm(config)
    .then(check_for_existing_config)
    .then(check_for_existing_package_json)
}
