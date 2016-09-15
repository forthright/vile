/// <reference path="../../lib/typings/index.d.ts" />

var inquirer = require("inquirer")
var fs = require("fs")
var Bluebird : typeof bluebird.Promise = require("bluebird")
var _ = require("lodash")

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

var get_chosen_ignored_directories = (
  dirs : string[]
) : bluebird.Promise<string[]> => {
  if (_.isEmpty(dirs)) return Bluebird.resolve(dirs)

  let choices : any[] = _.map(dirs, (dir : string) => {
    return { name: dir }
  })

  return inquirer.prompt({
    type: "checkbox",
    message: "Select any directories or files to ignore.",
    name: "dirs",
    choices: choices,
    validate: (answer) => true
  })
  .then((answers : any) => answers.dirs)
}

var ignored_directories = (directory : string) : bluebird.Promise<string[]> =>
  fs.readdirAsync(directory)
    .then((targets : string[]) =>
      _.filter(targets, (target : string) =>
        fs.statSync(target).isDirectory() &&
          _.some(IGNORE_DIRECTORIES, (dir : string) => dir == target)))
    .then(get_chosen_ignored_directories)

var get_any_extra_directories_from_user = () : bluebird.Promise<string[]> =>
  inquirer.prompt([
    {
      type: "input",
      name: "extra_ignore_dirs",
      message: "Enter paths (separate with commas):"
    }
  ])
  .then((answers : any) => {
    let dirs : string = answers.extra_ignore_dirs
    return _.compact(_.toString(dirs).split(","))
  })

var get_any_extra_directories = () : bluebird.Promise<string[]> =>
  inquirer.prompt([
    {
      type: "confirm",
      name: "get_extra_dirs",
      message: "Would you like to manually add paths to ignore?",
      default: true
    }
  ]).then((answers : any) => {
    if (answers.get_extra_dirs) {
      return get_any_extra_directories_from_user()
    } else {
      return Bluebird.resolve([])
    }
  })

var check_for_ignored_directories = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> =>
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

module.exports = {
  init: check_for_ignored_directories
}
