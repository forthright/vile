// TODO: make a bin/ shim to make this a pure module?
import Bluebird = require("bluebird")
import _ = require("lodash")
import plugin = require("./../plugin")
import logger = require("./../logger")

const log = logger.create("worker")

// Note: This only registers for worker forked processes
process.on("unhandledRejection", (
  error : NodeJS.ErrnoException | string,
  promise : Bluebird<any>
) => {
  log_and_exit(error, true)
})

const ping_parent = (process : any) : void => process.send("")

const log_and_exit = (
  error : any,
  was_promise? : boolean
) : void => {
  const msg : string = _.get(error, "stack", error)

  if (was_promise) {
    log.error("Unhandled Promise.reject:", msg)
  } else {
    log.error("\n", msg)
  }

  process.exit(1)
}

const set_ignore_list = (
  plugin_config : vile.PluginConfig,
  base : vile.IgnoreList
) : void => {
  const list = _.compact(_.concat([], _.get(plugin_config, "ignore", [])))
  _.set(plugin_config, "ignore", _.uniq(list.concat(base)))
}

const set_allow_list = (
  plugin_config : vile.PluginConfig,
  base : vile.AllowList
) : void => {
  if (!_.isEmpty(base)) {
    _.set(plugin_config, "allow", _.compact(_.concat([], base)))
  } else {
    const list = _.get(plugin_config, "allow", [])
    _.set(plugin_config, "allow", _.compact(_.concat([], list)))
  }
}

const get_plugin_config = (
  name : string,
  config : vile.YMLConfig
) : vile.PluginConfig => {
  const plugin_config : any = _.get(config, name, {})
  const vile_ignore : string[] = _.get(config, "vile.ignore", [])
  const vile_allow : string[] = _.get(config, "vile.allow", [])

  set_ignore_list(plugin_config, vile_ignore)
  set_allow_list(plugin_config, vile_allow)

  return plugin_config
}

const handle_worker_request = (data : vile.PluginWorkerData) : void => {
  const plugins : string[] = data.plugins
  const config : vile.YMLConfig = data.config

  Bluebird.map(plugins, (plugin_name : string) => {
    const name : string = plugin_name.replace("vile-", "")
    const plugin_config = get_plugin_config(name, config)
    return plugin.exec_plugin(name, plugin_config)
  })
  .then(_.flatten)
  .then((issues) => process.send(issues))
  .catch(log_and_exit) // since we could be in a forked proc
}

process.on("message", handle_worker_request)

ping_parent(process)
