import yaml = require("js-yaml")
import fs = require("fs")
import logger = require("./logger")

const log = logger.create("config")

let conf : vile.YMLConfig = {}

const load_config_from_file = (
  filepath : string
) : vile.YMLConfig => {
  try {
    return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf-8"))
  } catch(e) {
    log.error(e)
  }
}

const load_auth_config_from_env = () : vile.Auth => {
  let env = process.env
  return {
    token : env.VILE_API_TOKEN,
    project : env.VILE_PROJECT
  }
}

const get : vile.YMLConfig = () => conf

export = <vile.Lib.Config>{
  load: load_config_from_file,
  get: get,
  get_auth: load_auth_config_from_env
}
