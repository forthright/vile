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
  ) =>
    detect(filepath, (err : string, language : string) =>
      err ?
        reject(err) :
        resolve(language)
    ))

const check_for_project_languages = (
  config : ferret.YMLConfig
) : Bluebird<ferret.YMLConfig> => {
  const langs : string[] = []

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
    const uniq_langs : string[] = _.chain(_.filter(_.uniq(langs)))
      .map((lang : string) => lang.toLowerCase())
      .filter((lang : string) =>
        _.some(_.keys(plugin_map.langs),
          (l : string) => l == lang))
      .value()

    if (_.isEmpty(uniq_langs)) return Bluebird.resolve(config)

    return (inquirer as any).prompt({
      choices: _.map(uniq_langs, (lang : string) => {
        return { name: lang }
      }),
      message: "Found some available plugins. Select any languages that apply!",
      name: "langs",
      type: "checkbox",
      validate: (answer : string[]) => true
    })
    .then((answers : any) => {
      _.each(
        _.get(answers, "langs", []),
        (lang : string) => {
          const lcase = lang.toLowerCase()
          const plugins = plugin_map.langs[lcase] || []
          config.ferret.plugins = config.ferret.plugins.concat(plugins)
        })

      return config
    })
  })
}

export = {
  init: check_for_project_languages
}
