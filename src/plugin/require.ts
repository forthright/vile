import Promise = require("bluebird")
import fs = require("fs")
import path = require("path")
import _ = require("lodash")
import logger = require("./../logger")
import PluginNotFoundError = require("./plugin_not_found_error")

const readdirAsync = Promise.promisify(fs.readdir)

const log = logger.create("plugin")

// NOTE: defined in package.json dependencies section
// HACK: THIS IS DUPED in version.js for now
const BUNDLED_PLUGINS = [
  "ferret-comment",
  "ferret-coverage",
  "ferret-stat"
]

const NODE_MODULES : string = "node_modules"

const FORTHRIGHT_NPM_PATH: string = "@forthright"

const is_plugin = (name : string) : boolean =>
  !!/^ferret-/.test(name)

const cannot_find_module = (
  err : NodeJS.ErrnoException | string
) : boolean =>
  /cannot find module/i.test(
    _.get(err, "stack", (err as string)))

const _locate = (module_name : string, orgname = "") : ferret.Plugin => {
  const cwd_node_modules = path.join(process.cwd(), NODE_MODULES, orgname)
  const module_name_cwd_node_modules = `${cwd_node_modules}/${module_name}`

  let plugin : ferret.Plugin

  try {
    // CWD first (in case a bundled plugin is also locally installed)
    log.debug("require(", module_name_cwd_node_modules, ")")
    plugin = require(module_name_cwd_node_modules)
    log.debug("found", module_name_cwd_node_modules)
  } catch (e) {
    if (cannot_find_module(e)) {
      try {
        const module_loc = path.join(orgname, module_name)
        log.debug("require(", module_loc, ")")
        plugin = require(module_loc)
        log.debug("found", module_loc)
      } catch (e2) {
        if (cannot_find_module(e2)) {
          throw new PluginNotFoundError(e2)
        } else { throw e2 }
      }
    } else { throw e }
  }

  return plugin
}

const locate = (name : string) : ferret.Plugin => {
  let plugin : ferret.Plugin

  try {
    plugin = _locate(name, FORTHRIGHT_NPM_PATH)
  } catch (e) {
    if (e.name == "PluginNotFoundError") {
      plugin = _locate(name)
    } else {
      throw e
    }
  }

  return plugin
}

const node_modules_list = (
  org : string = "",
) : Promise<string[]> => {
  const m_path = path.join(process.cwd(), NODE_MODULES, org)
  if (fs.existsSync(m_path)) {
    return readdirAsync(m_path)
      .then((list : string[]) =>
        _.map(_.filter(list, (item : string) =>
          is_plugin(item)
        ), (item : string) => path.join(org, item)))
  } else {
    return Promise.resolve([])
  }
}

const filter_plugins_to_run = (
  installed : ferret.PluginList,
  via_config : ferret.PluginList, // via .ferret.yml
  via_opts : ferret.PluginList, // via CLI opt
  via_additional_opts : ferret.PluginList, // for bundling meta pkg bins
  skip_core_plugins : boolean
) : ferret.PluginList => {
  const allowed_plugins : ferret.PluginList = _
    .isEmpty(via_opts) ? via_config : _.concat([], via_opts)

  let to_run : ferret.PluginList = skip_core_plugins ?
    installed :
    _.concat(installed, BUNDLED_PLUGINS)

  to_run = _.uniq(to_run.concat(via_additional_opts))

  return _.isEmpty(allowed_plugins) ?
    to_run :
    _.filter(to_run, (p) =>
      _.some(allowed_plugins, (a) =>
        p.replace(/ferret\-/, "") == a))
}

const available_plugins = () : Promise<string[][]> => {
  // HACK: duped in plugin.ts but with @forthright on
  const bundled : string[] = _.map(BUNDLED_PLUGINS, (p_name : string) =>
    `@forthright/${p_name}`)

  return Promise.all([
    node_modules_list(),
    node_modules_list("@forthright")
  ])
  .then(_.flatten)
  .then((list : string[]) =>
    _.map(_.uniq(_.concat([], bundled, list)), (mod : string) => {
      const version = require(`${mod}/package`).version
      return [ mod, version ]
    }))
}

export = {
  available_modules: available_plugins,
  bundled: BUNDLED_PLUGINS,
  filter: filter_plugins_to_run,
  locate: locate
}
