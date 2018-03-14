import commander = require("commander")
import plugin_require = require("./../plugin/require")
import _ = require("lodash")
import os_name = require("os-name")

const pkg = require("./../../package")

const log_node_versions = () : void => {
  console.log(os_name())
  _.each(process.versions, (v : string, k : string) => {
    console.log(k, v)
  })
}

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("versions")
    .alias("version")
    .action(() => {
      console.log("ferret", pkg.version)
      plugin_require.available_modules().then((mods : string[][]) => {
        _.each(mods, (mod : string[]) => {
          console.log(_.last(_.split(mod[0], "/")), _.last(mod))
        })
        log_node_versions()
      })
    })

export = { create }
