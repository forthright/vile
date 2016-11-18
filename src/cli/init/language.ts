/// <reference path="../../@types/index" />

import detect = require("language-detect")
import inquirer = require("inquirer")
import _ = require("lodash")
import Bluebird = require("bluebird")
import util = require("./../../util")
import plugin_map = require("./map")

const KNOWN_PROJECT_DIRS = [
  "app/controllers",
  "app/views",
  "app/models",
  "app/models",
  "app/assets/javascripts",
  "app/assets/stylesheets",
  "config",
  "src",
  "lib",
  "test",
  "spec"
]

const detect_language = (
  filepath : string
) : Bluebird<string> =>
  new Bluebird((
    resolve : (s : string) => void,
    reject : (s : string) => void
  ) => {
    detect(filepath, function (err : string, language : string) {
      err ?
        reject(err) :
        resolve(language)
    })
  })

const check_for_project_languages = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> => {
  let langs : string[] = []

  return util.promise_each(
    process.cwd(),
    util.filter([], KNOWN_PROJECT_DIRS),
    (file : string) =>
      detect_language(file)
        .then((language : string) => {
          // HACK: typescript does not show up ATM
          if (/\.ts$/.test(file)) {
            langs.push("typescript")
          } else {
            langs.push(language)
          }
        })
    , { read_data: false })
  .then(() => {
    let uniq_langs : string[] = _.chain(_.filter(_.uniq(langs)))
      .map((lang : string) => lang.toLowerCase())
      .value()

    if (_.isEmpty(uniq_langs)) return Bluebird.resolve(config)

    return (<any>inquirer).prompt({
      type: "checkbox",
      message: "It appears you speak our language. Select any that apply!",
      name: "langs",
      choices: _.map(uniq_langs, (lang : string) => {
        return { name: lang }
      }),
      validate: (answer : string[]) => true
    })
    .then((answers : any) => {
      _.each(
        _.get(answers, "langs", []),
        (lang : string) => {
          let lcase = lang.toLowerCase()
          let plugins = plugin_map.langs[lcase] || []
          config.vile.plugins = config.vile.plugins.concat(plugins)
        })

      return config
    })
  })
}

export = {
  init: check_for_project_languages
}
