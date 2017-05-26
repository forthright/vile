import inquirer = require("inquirer")
import fs = require("fs")
import Bluebird = require("bluebird")
import _ = require("lodash")

const IGNORE_DIRECTORIES = [
  "node_modules",
  "app/assets/images",
  "bower_components",
  "typings",
  "build",
  ".build",
  ".test",
  ".git",
  "tmp",
  "vendor",
  "coverage"
]

const get_chosen_ignored_directories = (
  dirs : string[]
) : Bluebird<string[]> => {
  if (_.isEmpty(dirs)) return Bluebird.resolve(dirs)

  const choices : any[] = _.map(dirs, (dir : string) => {
    return { name: dir }
  })

  // HACK: then is not on type Prompt?
  return (inquirer as any).prompt({
    choices,
    message: "Select any directories or files to ignore.",
    name: "dirs",
    type: "checkbox",
    validate: (answer : string[]) => true
  })
  .then((answers : any) => answers.dirs)
}

const ignored_directories = (directory : string) : Bluebird<string[]> =>
  (fs as any).readdirAsync(directory)
    .then((targets : string[]) =>
      _.filter(targets, (target : string) =>
        fs.statSync(target).isDirectory() &&
          _.some(IGNORE_DIRECTORIES, (dir : string) => dir == target)))
    .then(get_chosen_ignored_directories)

const get_any_extra_directories_from_user = () : Bluebird<string[]> =>
  (inquirer as any).prompt([
    {
      message: "Enter paths (separate with commas):",
      name: "extra_ignore_dirs",
      type: "input"
    }
  ])
  .then((answers : any) => {
    const dirs : string = answers.extra_ignore_dirs
    return _.compact(_.toString(dirs).split(","))
  })

const get_any_extra_directories = () : Bluebird<string[]> =>
  (inquirer as any).prompt([
    {
      default: true,
      message: "Would you like to manually add paths to ignore?",
      name: "get_extra_dirs",
      type: "confirm"
    }
  ]).then((answers : any) => {
    if (answers.get_extra_dirs) {
      return get_any_extra_directories_from_user()
    } else {
      return Bluebird.resolve([])
    }
  })

const check_for_ignored_directories = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> =>
  ignored_directories(process.cwd())
    .then((ignored_dirs : string[]) =>
      get_any_extra_directories()
        .then((dirs : string[]) => {
          config.vile.ignore = _.uniq(_.concat(
            "node_modules",
            ignored_dirs,
            dirs
          ))

          return config
        }))

export = {
  init: check_for_ignored_directories
}
