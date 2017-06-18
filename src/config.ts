import yaml = require("js-yaml")
import fs = require("fs")
import ConfigParseError = require("./config/config_parse_error")

const DEFAULT_VILE_YML = ".vile.yml"

let conf : vile.YMLConfig = {}

const load_config = (
  filepath = DEFAULT_VILE_YML
) : vile.YMLConfig => {
  if (filepath == DEFAULT_VILE_YML && !fs.existsSync(filepath)) {
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

const load_auth_config_from_env = () : vile.Auth => {
  const env = process.env
  return {
    project : env.VILE_PROJECT,
    token : env.VILE_TOKEN
  }
}

const get_conf : vile.YMLConfig = () => conf

export = {
  get: get_conf,
  get_auth: load_auth_config_from_env,
  load: load_config
}
