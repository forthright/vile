/// <reference path="lib/typings/index.d.ts" />

module vile {

let yaml = require("js-yaml")
let fs = require("fs")
let logger = require("./logger")
let log = logger.create("config")
let conf
let auth_conf

let load_config_from_file = (filepath) => {
  try {
    return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf8"))
  } catch(e) {
    log.error(e)
  }
}

let load_auth_config_from_file = (filepath) => {
  try {
    return auth_conf = yaml.safeLoad(fs.readFileSync(filepath, "utf8"))
  } catch(e) {
    log.error(e)
  }
}

let get = () => conf || {}

let get_auth = () => auth_conf || {}

module.exports = <Vile.Lib.Config>{
  load: load_config_from_file,
  get: get,
  load_auth: load_auth_config_from_file,
  get_auth: get_auth
}

}
