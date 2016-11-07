/// <reference path="@types/index.d.ts" />

import yaml = require("js-yaml")
import fs = require("fs")
import logger = require("./logger")

const log = logger.create("config")

let conf = {}

const load_config_from_file = (filepath) => {
  try {
    return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf-8"))
  } catch(e) {
    log.error(e)
  }
}

const load_auth_config_from_env = () => {
  let env = process.env
  let auth_conf : vile.Auth = {
    token : env.VILE_API_TOKEN,
    project : env.VILE_PROJECT
  }
  return auth_conf
}

const get = () => conf

export = <vile.Lib.Config>{
  load: load_config_from_file,
  get: get,
  get_auth: load_auth_config_from_env
}
