/// <reference path="../lib/typings/index.d.ts" />

// TODO: make a bin/ shim to make this a pure module?
var Bluebird : typeof bluebird.Promise = require("bluebird")
var _ = require("lodash")
var plugin = require("./../plugin")
var logger : Vile.Lib.Logger  = require("./../logger")
var log = logger.create("worker")

var ping_parent = (process : any) => process.send("")

// TODO: duped
var is_array = (list) => list && typeof list.forEach == "function"

var set_ignore_list = (plugin_config, base) => {
  let list = _.get(plugin_config, "ignore", [])

  if (_.isString(list)) list = [list]

  if (_.isEmpty(list)) {
    _.set(plugin_config, "ignore", base)
  } else if (is_array(list)) {
    _.set(plugin_config, "ignore", _.uniq(list.concat(base)))
  }
}

var set_allow_list = (plugin_config, base) => {
  if (!_.isEmpty(base)) {
    if (_.isString(base)) base = [base]
    _.set(plugin_config, "allow", base)
  } else {
    let list = _.get(plugin_config, "allow", [])
    if (_.isString(list)) list = [list]
    _.set(plugin_config, "allow", list)
  }
}

var get_plugin_config = (name : string, config : Vile.YMLConfig) => {
  let plugin_config : any = _.get(config, name, {})
  let vile_ignore : string[] = _.get(config, "vile.ignore", [])
  let vile_allow : string[] = _.get(config, "vile.allow", [])

  set_ignore_list(plugin_config, vile_ignore)
  set_allow_list(plugin_config, vile_allow)

  return plugin_config
}

var handle_worker_request = (data : Vile.Lib.PluginWorkerData) => {
  let plugins : string[] = data.plugins
  let config : Vile.YMLConfig = data.config

  Bluebird.map(plugins, (plugin_name : string) => {
    let name : string = plugin_name.replace("vile-", "")
    let plugin_config = get_plugin_config(name, config)
    return plugin.exec_plugin(name, plugin_config)
      .catch((err) => {
        console.log() // newline because spinner is running
        log.error(err.stack || err)
        process.exit(1)
      })
  })
  .then(_.flatten)
  .then((issues) => process.send(issues))
}

process.on("message", handle_worker_request)

ping_parent(process)
