import path = require("path")
import PluginNotFoundError = require("./plugin_not_found_error")

const FORTHRIGHT_NPM : string = "@forthright"

const cannot_find_module = (
  err : NodeJS.ErrnoException | string
) : boolean =>
  /cannot find module/i.test(
    _.get(err, "stack", (err as string)))

const _locate = (name : string, orgname = "") : ferret.Plugin => {
  const cwd_node_modules = path.join(process.cwd(), "node_modules")
  const module_name = `${orgname}ferret-${name}`
  const module_name_cwd_node_modules = `${cwd_node_modules}/${module_name}`

  let plugin : ferret.Plugin

  try {
    // CWD first (in case a bundled plugin is also locally installed)
    plugin = require(module_name_cwd_node_modules)
  } catch (e) {
    if (cannot_find_module(e)) {
      try {
        plugin = require(module_name)
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
    // official plugins
    plugin = _locate(name, FORTHRIGHT_NPM)
  } catch (e : Error) {
    if (e.name == "PluginNotFoundError") {
      // unofficial plugins
      plugin = _locate(name)
    } else {
      throw e
    }
  }

  return plugin
}

export {
  locate
}
