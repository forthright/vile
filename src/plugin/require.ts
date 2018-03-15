import Promise = require("bluebird")
import fs = require("fs")
import path = require("path")
import _ = require("lodash")
import logger = require("./../logger")
import PluginNotFoundError = require("./plugin_not_found_error")

const readdirAsync = Promise.promisify(fs.readdir)

const log = logger.create("plugin")

const NODE_MODULES : string = "node_modules"

const OFFICIAL_SCOPE: string = "@forthright"

const is_plugin = (name : string) : boolean =>
  !!/^ferret-/.test(name)

const cannot_find_module = (
  err : NodeJS.ErrnoException | string,
  module_loc : string
) : boolean =>
  new RegExp(`cannot find module '${module_loc}'`, "i")
    .test(_.get(err, "stack", (err as string)));

const _locate = (
  base_path : string,
  module_name : string,
  org_name = ""
) : ferret.Plugin => {

  const modules_path = path.join(
    base_path, NODE_MODULES, org_name)

  let plugin : ferret.Plugin

  log.debug(`looking for ${module_name} in:`, modules_path)

  // CWD first (in case a bundled plugin is also locally installed)
  const module_loc = path.join(modules_path, module_name)

  try {
    plugin = require(module_loc)
    log.debug("using", module_loc)
  } catch (e) {
    if (cannot_find_module(e, module_loc)) {
      throw new PluginNotFoundError(e)
    } else {
      // HACK: just error log
      log.error(e)
    }
  }

  return plugin
}

const locate = (name : string) : ferret.Plugin => {
  let plugin : ferret.Plugin

  const local_modules = process.cwd()

  try {
    plugin = _locate(local_modules, name)
  } catch (e) {
    if (e.name != "PluginNotFoundError") {
      throw e
    } else {
      try {
        plugin = _locate(local_modules, name, OFFICIAL_SCOPE)
      } catch (e2) {
        const bundled_modules = _.get(process, "env.FERRET_PLUGINS_PATH")
        if (!bundled_modules) {
          throw e2
        } else {
          try {
            plugin = _locate(bundled_modules, name)
          } catch (e3) {
            if (e.name == "PluginNotFoundError") {
              plugin = _locate(bundled_modules, name, OFFICIAL_SCOPE)
            } else {
              throw e3
            }
          }
        }
      }
    }
  }

  return plugin
}

// TODO: list and locate methods overlap
const node_modules_list = (
  base : string,
  org : string = "",
) : Promise<string[]> => {
  const m_path = path.join(base, NODE_MODULES, org)
  if (fs.existsSync(m_path)) {
    return readdirAsync(m_path)
      .then((list : string[]) =>
        _.map(_.filter(list, (item : string) =>
          is_plugin(item)
        ), (item : string) =>
          path.join(m_path, item)
        ))
  } else {
    log.debug("empty:", m_path)
    return Promise.resolve([])
  }
}

const filter_plugins_to_run = (
  installed : ferret.PluginList,
  via_config : ferret.PluginList, // via .ferret.yml
  via_opts : ferret.PluginList, // via CLI opt
  via_additional_opts : ferret.PluginList // for bundling meta pkg bins
) : ferret.PluginList => {
  const allowed_plugins : ferret.PluginList = _
    .isEmpty(via_opts) ? via_config : _.concat([], via_opts)

  const to_run = _.uniq(_.concat([], installed, via_additional_opts))

  return _.isEmpty(allowed_plugins) ?
    to_run :
    _.filter(to_run, (p) =>
      _.some(allowed_plugins, (a) =>
        p.replace(/ferret\-/, "") == a))
}

const available_plugins = () : Promise<string[][]> => {
  const cwd = process.cwd()
  const potential_locations : Promise<string[]>[] = [
    node_modules_list(cwd),
    node_modules_list(cwd, "@forthright")
  ]

  const bundled_modules = _.get(process, "env.FERRET_PLUGINS_PATH")
  if (bundled_modules) {
    const abs_path = path.resolve(bundled_modules)
    potential_locations.push(
      node_modules_list(abs_path),
      node_modules_list(abs_path, "@forthright"))
  }

  return Promise
    .all(potential_locations)
    .then(_.flatten)
    .then((list : string[]) => {
      log.debug("known locations...", "\n=> " +
        (list.join("\n=> ") || "none"))
      return _.map(_.uniq(list), (mod_path : string) => {
        const version = require(path.join(mod_path, "package.json")).version
        return [ mod_path, version ]
      })
    })
}

export = {
  available_modules: available_plugins,
  filter: filter_plugins_to_run,
  locate: locate
}
