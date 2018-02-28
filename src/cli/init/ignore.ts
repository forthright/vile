import inquirer = require("inquirer")
import fs = require("fs")
import Bluebird = require("bluebird")
import _ = require("lodash")

const fs_readdir = Bluebird.promisify(fs.readdir)

const EXTRA_IGNORE_DIRECTORIES = [
  "bin",
  ".bin",
  "build",
  ".build",
  "public",
  ".test",
  ".tmp",
  "typings"
]

const get_chosen_ignored_directories = (
  dirs : string[]
) : Bluebird<string[]> => {
  if (_.isEmpty(dirs)) return Bluebird.resolve(dirs)

  const choices : any[] = _.map(dirs, (dir : string) => {
    return { name: dir }
  })

  return new Bluebird((resolve, reject) => {
    inquirer.prompt({
      choices,
      message: "Select any extra directories or files to ignore.",
      name: "dirs",
      type: "checkbox",
      validate: () => true
    })
    .then((answers : inquirer.Answers) => {
      resolve((answers.dirs as string[]))
    })
  })
}

const ignored_directories = (directory : string) : Bluebird<string[]> =>
  fs_readdir(directory)
    .then((targets : string[]) =>
      _.filter(targets, (target : string) =>
        fs.statSync(target).isDirectory() &&
          _.some(EXTRA_IGNORE_DIRECTORIES, (dir : string) => dir == target)))
    .then(get_chosen_ignored_directories)

const check_for_ignored_directories = (
  config : ferret.YMLConfig
) : Bluebird<ferret.YMLConfig> =>
  ignored_directories(process.cwd())
    .then((ignored_dirs : string[]) => {
      config.ferret.ignore = _.uniq(ignored_dirs)
      return config
    })

export = {
  init: check_for_ignored_directories
}
