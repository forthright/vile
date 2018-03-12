import fs = require("fs")
import path = require("path")
import commander = require("commander")
import _ = require("lodash")
import os_name = require("os-name")

const pkg = require("./../../package")

const NODE_MODULES : string = "node_modules"

const module_package_json = (name : string) : string =>
  path.join(
    __dirname, "..", "..",
    NODE_MODULES, name, "package.json")

const log_node_versions = () : void => {
  console.log(os_name())
  _.each(process.versions, (v : string, k : string) => {
    console.log(k, v)
  })
}

const log_sub_packages = (cb : () => void) : void => {
  fs.readdir(NODE_MODULES, (
    err : NodeJS.ErrnoException,
    list : string[]
  ) => {
    _.each(list, (mod : string) => {
      if (/^ferret-/.test(mod)) {
        const mod_loc = module_package_json(mod)
        const version = require(mod_loc).version
        console.log(mod, version)
      }
    })
    cb()
  })
}

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("modules")
    .action(() => {
      console.log("ferret", pkg.version)

      if (fs.existsSync(NODE_MODULES)) {
        log_sub_packages(() => log_node_versions())
      } else {
        log_node_versions()
      }
    })

export = { create }
