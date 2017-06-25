import fs = require("fs")
import path = require("path")
import inquirer = require("inquirer")
import Bluebird = require("bluebird")

const welcome_confirm = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> =>
  (inquirer as any).prompt([
    {
      default: true,
      message: "Hello friend. Please follow the prompts and " +
        "answer as best you can.",
      name: "ok_to_proceed",
      type: "confirm"
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
  const vile_yml_path = path.join(process.cwd(), ".vile.yml")

  if (fs.existsSync(vile_yml_path)) {
    return (inquirer as any).prompt([
      {
        default: true,
        message: "Found an existing .vile.yml. OK to overwrite?",
        name: "ok_to_overwrite",
        type: "confirm"
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
  const pkg_json_path = path.join(process.cwd(), "package.json")

  if (fs.existsSync(pkg_json_path)) return Bluebird.resolve(config)

  const pkg_json_shell = {
    description: "Run `npm install` in a freshly cloned " +
      "project to install vile. This does not include non-npm " +
      "based peer dependency requirements. See plugin readme(s) for details.",
    name: "vile-project-dependency-config",
    private: true,
    scripts: {
      "vile-publish": "vile a -n -u project_name"
    }
  }

  const file_data = new Buffer(JSON.stringify(pkg_json_shell, null, "  "))

  return (fs as any).writeFileAsync(pkg_json_path, file_data)
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
