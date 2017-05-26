import fs = require("fs")
import Bluebird = require("bluebird")
import inquirer = require("inquirer")
import _ = require("lodash")
import plugin_map = require("./map")

const exists = (file : string) =>
  fs.existsSync(file)

const read = (file : string) =>
  fs.readFileSync(file).toString()

const check_for_project_frameworks = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> => {
  const frameworks : string[] = []

  if (exists("config.ru") && /Rails/g.test(read("config.ru"))) {
    frameworks.push("rails")
  }

  // TODO: a lot of false positives here (atom, etc)
  if (exists("node_modules") || exists("package.json")) {
    frameworks.push("nodejs")
  }

  if (exists("bower.json")) frameworks.push("bower")
  if (exists("Gemfile")) frameworks.push("bundler")

  if (exists(".editorconfig")) frameworks.push("editorconfig")

  if (exists(".retireignore")) frameworks.push("retirejs")

  if (exists(".eslintrc") ||
      exists(".eslintrc.yml") ||
      exists(".eslintrc.yaml") ||
      exists(".eslintrc.json") ||
      exists(".eslintrc.js")) {
    frameworks.push("eslint")
  }

  if (exists(".jshintrc") || exists(".jshintignore")) {
    frameworks.push("jshint")
  }

  if (exists("coffeelint.json")) frameworks.push("coffeelint")

  if (exists(".sass-lint.yml")) frameworks.push("sass-lint")

  if (exists(".rubocop.yml")) frameworks.push("rubocop")

  if (exists(".slim-lint.yml")) frameworks.push("slim-lint")

  if (exists(".brakeman.yml")) frameworks.push("brakeman")

  if (exists(".git")) frameworks.push("git")

  return (inquirer as any).prompt({
    choices: _.map(frameworks, (name : string) => {
      return { name, checked: true }
    }),
    message: "Looks like you have a number of frameworks and tooling." +
      " Please uncheck any that don't apply.",
    name: "frameworks",
    type: "checkbox",
    validate: (answer : string[]) => true
  })
  .then((answers : any) => {
    _.each(
      _.get(answers, "frameworks", []),
      (name : string) => {
        _.each(plugin_map.frameworks[name], (plugin : string) => {
          config.vile.plugins.push(plugin)
        })
      })

    if (_.isEmpty(frameworks)) return Bluebird.resolve(config)

    // strain out any dupes
    config.vile.plugins = _.uniq(config.vile.plugins)

    return config
  })
}

export = {
  init: check_for_project_frameworks
}
