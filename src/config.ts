/// <reference path="lib/typings/index.d.ts" />

module vile {

let yaml = require("js-yaml")
let fs = require("fs")
let logger = require("./logger")
let log = logger.create("config")
let conf = {}

let load_config_from_file = (filepath) => {
  try {
    return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf8"))
  } catch(e) {
    log.error(e)
  }
}

let get = () => conf

module.exports = <Vile.Lib.Config>{
  load: load_config_from_file,
  get: get
}

}
