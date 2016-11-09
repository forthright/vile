/// <reference path="../@types/index.d.ts" />

// TODO: make a bin/ shim to make this a pure module?
import Bluebird = require("bluebird")
import _ = require("lodash")
import plugin = require("./../plugin")

const ping_parent = (process : any) : void => process.send("")

const set_ignore_list = (plugin_config, base) : void => {
  let list = _.compact(_.concat([], _.get(plugin_config, "ignore", [])))
  _.set(plugin_config, "ignore", _.uniq(list.concat(base)))
}

const set_allow_list = (plugin_config, base) : void => {
  if (!_.isEmpty(base)) {
    _.set(plugin_config, "allow", _.compact(_.concat([], base)))
  } else {
    let list = _.get(plugin_config, "allow", [])
    _.set(plugin_config, "allow", _.compact(_.concat([], list)))
  }
}

const get_plugin_config = (name : string, config : vile.YMLConfig) : void => {
  let plugin_config : any = _.get(config, name, {})
  let vile_ignore : string[] = _.get(config, "vile.ignore", [])
  let vile_allow : string[] = _.get(config, "vile.allow", [])

  set_ignore_list(plugin_config, vile_ignore)
  set_allow_list(plugin_config, vile_allow)

  return plugin_config
}

const log_and_exit = (error : any) : void => {
  console.log() // next line if spinner
  console.error(_.get(error, "stack", error))
  process.exit(1)
}

const handle_worker_request = (data : vile.Lib.PluginWorkerData) : void => {
  let plugins : string[] = data.plugins
  let config : vile.YMLConfig = data.config

  Bluebird.map(plugins, (plugin_name : string) => {
    let name : string = plugin_name.replace("vile-", "")
    let plugin_config = get_plugin_config(name, config)
    return plugin.exec_plugin(name, plugin_config)
  })
  .then(_.flatten)
  .then((issues) => process.send(issues))
  .catch(log_and_exit) // since we could be in a forked proc
}

process.on("message", handle_worker_request)

ping_parent(process)
