import yaml = require("js-yaml")
import fs = require("fs")

let conf : vile.YMLConfig = {}

const load_config_from_file = (
  filepath : string
) : vile.YMLConfig => {
  try {
    return conf = yaml.safeLoad(fs.readFileSync(filepath, "utf-8"))
  } catch(e) {
    console.error(e)
    process.exit(1)
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
  load: load_config_from_file
} as vile.Lib.Config
