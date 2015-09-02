/// <reference path="lib/typings/index.d.ts" />

module vile {

let Bluebird : typeof bluebird.Promise = require("bluebird")
let fs = require("fs")
let path = require("path")
let cluster = require("cluster")
let _ = require("lodash")
// TODO: don't hardcode padding lower in module
let string = require("string-padder")
let spinner = require("cli-spinner")
let Spinner = spinner.Spinner
let logger = require("./logger")
let util = require("./util")
let score = require("./score")
let log = logger.create("plugin")

const NODE_MODULES = path.resolve(path.join(__dirname, "..", "node_modules"))

Bluebird.promisifyAll(fs)

let is_plugin = (name) => /^vile-/.test(name)

let valid_plugin = (api) => api && typeof api.punish == "function"

let is_array = (list) => list && typeof list.forEach == "function"

let is_promise = (list) => list && typeof list.then == "function"

let padRight = (num, txt="") => string.padRight(txt, num, " ")

let failed_message = (txt) => `${padRight(16, txt)}FAIL`

let passed_message = (txt) => `${padRight(16, txt)}PASS`

let log_error = (e : NodeJS.ErrnoException) => {
  console.log()
  log.error(e.stack || e)
}

let error_executing_plugins = (err : NodeJS.ErrnoException) => {
  log.error("Error executing plugins")
  log.error(err.stack || err)
  process.exit(1)
}

// TODO: DRY both methods

let humanize_line_char = (issue : Vile.Issue) : string => {
  let start : Vile.IssueLine = _.get(issue, "where.start", {})
  let end : Vile.IssueLine = _.get(issue, "where.end", {})

  let start_character : string = typeof start.character == "number" ?
    String(start.character) : ""

  let end_character : string = typeof end.line == "number" &&
    end.character != start.character ?  `-${String(end.character)}` : ""

  return typeof end.character == "number" ?
    `${start_character}${end_character}` : start_character
}

let humanize_line_num = (issue) : string => {
  let start : Vile.IssueLine = _.get(issue, "where.start", {})
  let end : Vile.IssueLine = _.get(issue, "where.end", {})

  let start_line : string = typeof start.line == "number" ?
    String(start.line) : ""

  let end_line : string = typeof end.line == "number" &&
    end.line != start.line ?  `-${String(end.line)}` : ""

  return typeof end.line == "number" ?
    `${start_line}${end_line}` : start_line
}

let to_console = (
  issue : Vile.Issue
) : string => {
  // TODO handle end of line being different
  let h_line = humanize_line_num(issue)
  let h_char = humanize_line_char(issue)
  let loc = h_line || h_char ?
    `line ${ h_line || "?" }, col ${ h_char || "?" }, ` : ""
  return `${ issue.file }: ${ loc }${ issue.msg }`
}

let log_plugin_messages = (
  name : string,
  issues : Vile.Issue[] = [],
  format : string = null
) => {
  if (format == "json") return

  let nlog = logger.create(name)

  issues.forEach((issue : Vile.Issue, index : number) => {
    if (issue.type == util.OK) return

    // TODO: lookup/log unknown logs
    let print : (s : string) => void = nlog[issue.type || "error"]
    print(to_console(issue))
  })
}

let require_plugin = (name : string) : Vile.Plugin => {
  try {
    return require(`vile-${name}`)
  } catch (e) {
    log.error(failed_message(name))
    log_error(e)
  }
}

let failed = (list : Vile.Issue[]) => {
  return _.reject(list,
    (item : Vile.Issue) => item.type == util.OK
  ).length > 0
}

let log_plugin = (
  name : string,
  list : Vile.Issue[] = [],
  format = null
) => {
  let message : string = failed(list) ?
    failed_message(name) : passed_message(name);

  log.info(message)
  log_plugin_messages(name, list, format)
}

let plugin_is_allowed = (name : string, allowed) : boolean => {
  return !allowed ||
    allowed.length == 0 ||
    _.some(allowed, (n) => n == name)
}

let run_plugin = (
  name : string,
  config : Vile.PluginConfig = {
    plugins: [],
    ignore: []
  }
) : bluebird.Promise<any> => {
  return new Bluebird((resolve, reject) => {
    let api : Vile.Plugin = require_plugin(name)

    if (!valid_plugin(api)) {
      return Bluebird.reject(`invalid plugin API: ${name}`)
    }

    let messages : any = api.punish(config)

    if (is_promise(messages)) {
      messages
        .then(resolve)
        .catch(reject) // TODO: keep running other plugins?
    } else if (is_array(messages)) {
      resolve(messages)
    } else {
      log.warn(`${name} plugin did not return [] or Promise<[]>`)
      resolve(<any>[]) // TODO: ?
    }
  })
}

let run_plugin_in_fork = (name : string, config : Vile.PluginConfig) => {
  return new Bluebird((resolve, reject) => {
    let worker = cluster.fork()

    worker.on("message", (issues) => {
      if (issues) {
        worker.disconnect()
        resolve(issues)
      } else {
        worker.send({
          name: name,
          config: config
        })
      }
    })

    worker.on("exit", (code, signal) => {
      if (signal) {
        let msg = `${name} worker was killed by signal: ${signal}`
        log.warn(msg)
        reject(msg)
      } else if (code !== 0) {
        let msg = `${name} worker exited with error code: ${code}`
        log.error(msg)
        reject(msg)
      }
    })
  })
}

// TODO: make into smaller methods
let into_executed_plugins = (
  allowed : string[],
  config : Vile.YMLConfig,
  format : string
) => (pkg_name : string) : bluebird.Promise<any> => {
  let name : string = pkg_name.replace("vile-", "")

  return new Bluebird((resolve : any, reject) : any => {
    if (!plugin_is_allowed(name, allowed)) return resolve([])

    let vile_ignore : Vile.PluginList = _.get(config, "vile.ignore", [])
    let plugin_config : any = config[name] || {}

    if (!plugin_config.ignore) {
      plugin_config.ignore = vile_ignore
    } else if (is_array(plugin_config.ignore)) {
      plugin_config.ignore = _.uniq(plugin_config.ignore.concat(vile_ignore))
    }

    if (cluster.isMaster) {
      let spin

      if (!process.env.NO_COLOR && format != "json") {
        // TODO: allow plugins to log things after spinner is stopped
        // TODO: don't do spinner in here? somewhere better to put spinner?
        spin = new Spinner(`${string.padRight(name, 26, " ")}PUNISH`)
        spin.setSpinnerDelay(60)
        spin.start()
      }

      run_plugin_in_fork(name, plugin_config)
        .then((issues : Vile.Issue[]) => {
          if (spin) spin.stop(true)
          log_plugin(name, issues, format) // TODO: don't log here
          resolve(issues)
        })
        .catch(() => {
          // Note: sub process already logs error
          reject(new Error(`${name} plugin died horribly..`))
          process.exit(1)
        })
    } else {
      process.on("message", (data) => {
        let name = data.name
        let plugin_config = data.config

        run_plugin(name, plugin_config)
          .then((issues) => process.send(issues))
          .catch((err) => {
            console.log() // newline because spinner is running
            log.error(err.stack || err)
            process.exit(1)
          })
      })
      process.send("")
    }
  })
}

let run_plugins = (
  custom_plugins : Vile.PluginList = [],
  config : Vile.YMLConfig = {},
  format = null
) : bluebird.Promise<Vile.IssuesPerFile> => {
  let app_config = _.get(config, "vile", {})
  let plugins : Vile.PluginList = custom_plugins

  // TODO: merge custom_list with config.plugins?
  if (custom_plugins.length == 0 && app_config.plugins) {
    plugins = app_config.plugins
  }

  return fs.readdirAsync(NODE_MODULES)
    .filter(is_plugin)
    .map(into_executed_plugins(plugins, config, format), { concurrency: 1 })
    .then(score.calculate_all)
    .catch(error_executing_plugins)
}

module.exports = {
  exec: run_plugins,
  exec_plugin: run_plugin
}

}
