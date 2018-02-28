import Bluebird = require("bluebird")
import commander = require("commander")
import pre = require("./init/pre")
import language = require("./init/language")
import framework = require("./init/framework")
import ignore = require("./init/ignore")
import post = require("./init/post")

const ferret_config_base = () : ferret.YMLConfig => {
  return {
    ferret: {
      allow: [],
      ignore: [],
      plugins: []
    }
  }
}

const initialize_ferret_project = (
  cli : commander.CommanderStatic
) : Bluebird<ferret.YMLConfig> =>
  pre.init(ferret_config_base())
    .then(ignore.init)
    .then(language.init)
    .then(framework.init)
    .then(post.init)

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("init")
    .alias("i")
    .action(initialize_ferret_project)

export = { create }
