/// <reference path="../../lib/typings/index.d.ts" />

var detect = require("language-detect")
var inquirer = require("inquirer")
var _ = require("lodash")
var Bluebird : typeof bluebird.Promise = require("bluebird")
var util = require("./../../util")
var plugin_map = require("./map")

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

var detect_language = (
  filepath : string
) : bluebird.Promise<any> =>
  new Bluebird((resolve, reject) => {
    detect(filepath, function (err, language) {
      err ?
        reject(err) :
        resolve(language)
    })
  })

var check_for_project_languages = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> => {
  let langs = []

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
    let uniq_langs = _.chain(langs)
      .uniq()
      .filter()
      .map((lang : string) => lang.toLowerCase())
      .value()

    if (_.isEmpty(uniq_langs)) return Bluebird.resolve(config)

    return inquirer.prompt({
      type: "checkbox",
      message: "It appears you speak our language. Select any that apply!",
      name: "langs",
      choices: _.map(uniq_langs, (lang : string) => {
        return { name: lang }
      }),
      validate: (answer) => true
    })
    .then((answers : any) => {
      _.each(
        _.get(answers, "langs", []),
        (lang : string) => {
          let lcase = lang.toLowerCase()
          let plugins = plugin_map.langs[lcase]

          if (plugins) {
            config.vile.plugins = config.vile.plugins.concat(plugins)
          }
        })

      return config
    })
  })
}

module.exports = {
  init: check_for_project_languages
}
