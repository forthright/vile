import yaml = require("js-yaml")
import fs = require("fs")
import ConfigParseError = require("./config/config_parse_error")

const DEFAULT_FERRET_YML = ".ferret.yml"

let conf : ferret.YMLConfig = {}

const load_config = (
  filepath = DEFAULT_FERRET_YML
) : ferret.YMLConfig => {
  if (filepath == DEFAULT_FERRET_YML && !fs.existsSync(filepath)) {
    conf = {}
    return conf
  }

  try {
    conf = yaml.safeLoad(fs.readFileSync(filepath, "utf-8"))
    return conf
  } catch (e) {
    throw new ConfigParseError(`${filepath}\n\n${e}`)
  }
}

const load_auth_config_from_env = () : ferret.Auth => {
  const env = process.env
  return {
    project : env.FERRET_PROJECT,
    token : env.FERRET_TOKEN
  }
}

const get_conf : ferret.YMLConfig = () => conf

const api : ferret.Module.Config = {
  get: get_conf,
  get_auth: load_auth_config_from_env,
  load: load_config
}

export = api
