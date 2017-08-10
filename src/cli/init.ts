import Bluebird = require("bluebird")
import commander = require("commander")
import pre = require("./init/pre")
import language = require("./init/language")
import framework = require("./init/framework")
import ignore = require("./init/ignore")
import post = require("./init/post")

const vile_config_base = () : vile.YMLConfig => {
  return {
    vile: {
      allow: [],
      ignore: [],
      plugins: []
    }
  }
}

const initialize_vile_project = (
  cli : commander.CommanderStatic
) : Bluebird<vile.YMLConfig> =>
  pre.init(vile_config_base())
    .then(ignore.init)
    .then(language.init)
    .then(framework.init)
    .then(post.init)

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("init")
    .alias("i")
    .action(initialize_vile_project)

export = { create }
