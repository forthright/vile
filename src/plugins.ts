/// <reference path="lib/typings/index.d.ts" />

var Bluebird : typeof bluebird.Promise = require("bluebird")
var fs = require("fs")
var path = require("path")
var cluster = require("cluster")
var os = require("os")
var linez = require("linez")
var _ = require("lodash")
// TODO: don't hardcode padding lower in module
var string = require("string-padder")
var spinner = require("cli-spinner")
var Spinner = spinner.Spinner
var ignore = require("ignore-file")
var logger : Vile.Lib.Logger  = require("./logger")
var util = require("./util")
var log = logger.create("plugin")

Bluebird.promisifyAll(fs)

var is_plugin = (name) => /^vile-/.test(name)

var valid_plugin = (api) => api && typeof api.punish == "function"

var is_array = (list) => list && typeof list.forEach == "function"

var is_promise = (list) => list && typeof list.then == "function"

var pad_right = (num, txt="") => string.padRight(txt, num, " ")

var failed_message = (txt) => `${pad_right(16, txt)}FAIL`

var passed_message = (txt) => `${pad_right(16, txt)}PASS`

var log_error = (e : NodeJS.ErrnoException) => {
  console.log()
  log.error(e.stack || e)
}

var error_executing_plugins = (err : NodeJS.ErrnoException) => {
  log.error("Error executing plugins")
  log.error(err.stack || err)
  process.exit(1)
}

// TODO: DRY both methods
// TODO: move logging out of plugins?

var humanize_line_char = (issue : Vile.Issue) : string => {
  let start : Vile.IssueLine = _.get(issue, "where.start", {})
  let end : Vile.IssueLine = _.get(issue, "where.end", {})

  let start_character : string = (
      typeof start.character == "number" || typeof start.character == "string"
    ) ? String(start.character) : ""

  let end_character : string = (
      typeof end.character == "number" || typeof end.character == "string"
    ) && end.character != start.character ? `-${String(end.character)}` : ""

  return typeof end.character == "number" ?
    `${start_character}${end_character}` : start_character
}

var humanize_line_num = (issue) : string => {
  let start : Vile.IssueLine = _.get(issue, "where.start", {})
  let end : Vile.IssueLine = _.get(issue, "where.end", {})

  let start_line : string = (
      typeof start.line == "number" || typeof start.line == "string"
    ) ? String(start.line) : ""

  let end_line : string = (
      typeof end.line == "number" || typeof end.line == "string"
    ) && end.line != start.line ? `-${String(end.line)}` : ""

  return typeof end.line == "number" ?
    `${start_line}${end_line}` : start_line
}

var to_console = (
  issue : Vile.Issue
) : string => {
  let h_line = humanize_line_num(issue)
  let h_char = humanize_line_char(issue)
  let details = _.has(issue, "title") &&
                issue.message != issue.title ?
                  `${issue.title} => ${issue.message}` : issue.title
  let loc = h_line || h_char ?
    `${ h_line ? "line " + h_line + ", " : "" }` +
    `${ h_char ? "col " + h_char + ", " : "" }` : ""
  return `${ issue.path }: ${ loc }${ details }`
}

var to_console_churn = (
  issue : Vile.Issue
) => `${ issue.path }: ${ issue.churn }`

var to_console_comp = (
  issue : Vile.Issue
) => `${ issue.path }: ${ issue.complexity }`

var to_console_lang = (
  issue : Vile.Issue
) => `${ issue.path }: ${ issue.language }`

var to_console_git = (
  issue : Vile.Issue
) => {
  let date = _.get(issue, "commit.commit_date") ||
              _.get(issue, "commit.author_date")
  let sha = _.get(issue, "commit.sha")
  return `${ sha }: ${ date }`
}

var is_error_or_warn = (issue : any) =>
  _.any(
    util.warnings.concat(util.errors),
    (t) => issue.type == t)

var log_issue_messages = (
  issues : Vile.Issue[] = []
) => {
  let nlogs = {}

  issues.forEach((issue : Vile.Issue, index : number) => {
    let t = issue.type
    if (!nlogs[t]) nlogs[t] = logger.create(t)

    if (_.any(util.errors, (t) => issue.type == t)) {
      nlogs[t].error(to_console(issue))
    } else if (_.any(util.warnings, (t) => issue.type == t)) {
      if (issue.type == util.COMP) {
        nlogs[t].info(to_console_comp(issue))
      } else if (issue.type == util.CHURN) {
        nlogs[t].info(to_console_churn(issue))
      } else {
        nlogs[t].warn(to_console(issue))
      }
    } else {
      if (issue.type == util.LANG) {
        nlogs[t].info(to_console_lang(issue))
      } else if (issue.type == util.GIT) {
        nlogs[t].info(to_console_git(issue))
      } else if (issue.type == util.OK) {
        nlogs[t].info(issue.path)
      } else {
        nlogs[t].info(to_console(issue))
      }
    }
  })
}

var require_plugin = (name : string) : Vile.Plugin => {
  let cwd_node_modules = process.cwd() + "/node_modules"

  try {
    return require(`${cwd_node_modules}/@forthright/vile-${name}`)
  } catch (e) {
    log.error(failed_message(name))
    log_error(e)
  }
}

var failed = (name : string, list : Vile.Issue[]) =>
  _.any(list, (item : Vile.Issue) =>
    item.plugin = name && is_error_or_warn(item))

var log_issues = (
  plugins : string[],
  issues : Vile.Issue[] = []
) => {
  log_issue_messages(issues)

  _.each(plugins, (plugin : string) => {
    let name : string = plugin.replace("vile-", "")
    let message : string = failed(name, issues) ?
      failed_message(name) : passed_message(name);
    log.info(message)
  })
}

var map_plugin_name_to_issues = (name : string) => (issues : Vile.Issue[]) =>
  _.map(issues, (issue : Vile.Issue) =>
    (issue.plugin = name, issue))

var run_plugin = (
  name : string,
  config : Vile.PluginConfig = {
    config: {},
    ignore: []
  }
) : bluebird.Promise<any> =>
  new Bluebird((resolve, reject) => {
    let api : Vile.Plugin = require_plugin(name)

    if (!valid_plugin(api)) {
      return Bluebird.reject(`invalid plugin API: ${name}`)
    }

    let issues : any = api.punish(config)

    if (is_promise(issues)) {
      issues
        .then(map_plugin_name_to_issues(name))
        .then(resolve)
        .catch(reject) // TODO: keep running other plugins?
    } else if (is_array(issues)) {
      resolve(map_plugin_name_to_issues(name)(issues))
    } else {
      log.warn(`${name} plugin did not return [] or Promise<[]>`)
      resolve(<any>[]) // TODO: ?
    }
  })

var run_plugins_in_fork = (
  plugins : string[],
  config : Vile.YMLConfig,
  worker : any
) =>
  new Bluebird((resolve, reject) => {
    worker.on("message", (issues) => {
      if (issues) {
        worker.disconnect()
        resolve(issues)
      } else {
        worker.send({
          plugins: plugins,
          config: config
        })
      }
    })

    worker.on("exit", (code, signal) => {
      let name = plugins.join(",")
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

var normalize_paths = (issues) =>
  _.each(issues, (issue) => {
    if (_.has(issue, "path")) {
      issue.path = issue.path
        .replace(process.cwd(), "")
        .replace(/^\/?/, "")
    }
  })

var get_plugin_config = (name : string, config : Vile.YMLConfig) => {
  let plugin_config : any = _.get(config, name, {})
  let vile_ignore : string[] = _.get(config, "vile.ignore", [])
  let vile_allow : string[] = _.get(config, "vile.allow", [])

  // TODO: dupe code below

  if (_.isEmpty(plugin_config.ignore)) {
    plugin_config.ignore = vile_ignore
  } else if (is_array(plugin_config.ignore)) {
    plugin_config.ignore = _.uniq(plugin_config.ignore.concat(vile_ignore))
  }

  if (_.isEmpty(plugin_config.allow)) {
    plugin_config.allow = vile_allow
  } else if (is_array(plugin_config.allow)) {
    plugin_config.allow = _.uniq(plugin_config.allow.concat(vile_allow))
  }

  return plugin_config
}

var ping_parent = (process : any) => process.send("")

var handle_worker_request = (data) => {
  let plugins : string[] = data.plugins
  let config : Vile.YMLConfig = data.config

  Bluebird.map(plugins, (plugin : string) => {
    let name : string = plugin.replace("vile-", "")
    let plugin_config = get_plugin_config(name, config)
    return run_plugin(name, plugin_config)
      .catch((err) => {
        console.log() // newline because spinner is running
        log.error(err.stack || err)
        process.exit(1)
      })
  })
  .then(_.flatten)
  .then((issues) => process.send(issues))
}

var check_for_uninstalled_plugins = (
  allowed : string[],
  plugins : Vile.PluginList
) => {
  let errors = false

  _.each(allowed, (name : string) => {
    if (!_.any(plugins, (plugin : string) =>
      plugin.replace("vile-", "") == name
    )) {
      errors = true
      log.error(`${name} is not installed`)
    }
  })

  if (errors) process.exit(1)
}

var execute_plugins = (
  allowed : Vile.PluginList = [],
  config : Vile.YMLConfig = null,
  opts : any = {}
) => (plugins : string[]) : bluebird.Promise<any> =>
  new Bluebird((resolve : any, reject) : any => {
    check_for_uninstalled_plugins(allowed, plugins)

    if (cluster.isMaster) {
      // TODO: own method
      if (allowed.length > 0) {
        plugins = _.select(plugins, (p) =>
                           _.any(allowed, (a) => p.replace("vile-", "") == a))
      }

      let spin
      let workers = {}
      let plugin_count : number = plugins.length
      let concurrency : number = os.cpus().length || 1

      cluster.on("fork", (worker) => {
        if (spin) spin.stop(true)
        log.info(
          `multitasking ${workers[worker.id]} ` +
          `(${worker.id}/${plugin_count})`)
        if (spin) spin.start()
      })

      if (opts.spinner && opts.format != "json") {
        spin = new Spinner("PUNISH")
        spin.setSpinnerDelay(60)
        spin.start()
      }

      (<any>Bluebird).map(plugins, (plugin : string) => {
        let worker = cluster.fork()
        workers[worker.id] = plugin.replace("vile-", "")
        return run_plugins_in_fork([ plugin ], config, worker)
          .then((issues : Vile.Issue[]) =>
            (normalize_paths(issues), issues))
          .catch((err) => {
            if (spin) spin.stop(true)
            log.error(err.stack || err)
            reject(err)
          })
      }, { concurrency: concurrency })
      .then(_.flatten)
      .then((issues : Vile.Issue[]) => {
        if (spin) spin.stop(true)
        if (opts.format != "json") log_issues(plugins, issues)
        resolve(issues)
      })
    } else {
      process.on("message", handle_worker_request)
      ping_parent(process)
    }
  })

var passthrough = (value : any) => value

var add_code_snippets = () =>
  (issues : Vile.IssueList) =>
    (<any>Bluebird).map(_.uniq(_.map(issues, "path")), (filepath : string) => {
      if (!(filepath &&
            fs.existsSync(filepath) &&
              fs.statSync(filepath).isFile())) return

      let lines = linez(fs.readFileSync(
        path.join(process.cwd(), filepath),
        "utf-8"
      )).lines

      _.each(_.select(issues, (i : Vile.Issue) => i.path = filepath),
        (issue : Vile.Issue) => {
          let start = Number(_.get(issue, "where.start.line", 0))
          let end = Number(_.get(issue, "where.end.line", start))
          if (start === 0 && end === start) return
          if (_.any(util.displayable_issues, (t) => t == issue.type)) {
            issue.snippet = lines.reduce((snippets, line, num) => {
              if ((num > (start - 4) && num < (end + 2))) {
                snippets.push({
                  offset: _.get(line, "offset"),
                  line: _.get(line, "number"),
                  text: _.get(line, "text", " "),
                  ending: _.get(line, "ending")
                })
              }
              return snippets
            }, [])
          }
        })

      lines = undefined
    })
    .then(() => issues)

var cwd_plugins_path = () =>
  path.resolve(path.join(process.cwd(), "node_modules", "@forthright"))

var add_ok_issues = (
  vile_allow  : Vile.AllowList = [],
  vile_ignore : Vile.IgnoreList = []
) =>
  (issues : Vile.IssueList) =>
    util.promise_each(
      process.cwd(),
      // TODO: don't compile ignore/allow every time
      // NOTE: need to fallthrough if is_dir, in case --gitdiff is set
      (p, is_dir) => (util.allowed(p, vile_allow) || is_dir) &&
        !util.ignored(p, vile_ignore) ,
      (filepath) => util.issue({
        type: util.OK,
        path: filepath
      }),
      { read_data: false })
    .then((ok_issues : Vile.IssueList) => {
      let distinct_ok_issues = _.reject(ok_issues, (issue : Vile.Issue) =>
        _.any(issues, (i) => i.path == issue.path))
      log_issue_messages(distinct_ok_issues)
      return distinct_ok_issues.concat(issues)
    })

var run_plugins = (
  custom_plugins : Vile.PluginList = [],
  config : Vile.YMLConfig = {},
  opts : any = {}
) : bluebird.Promise<Vile.IssueList> => {
  let app_config = _.get(config, "vile", {})
  let ignore = _.get(app_config, "ignore")
  let allow = _.get(app_config, "allow")
  let plugins : Vile.PluginList = custom_plugins

  if (app_config.plugins) {
    plugins = _.uniq(plugins.concat(app_config.plugins))
  }

  return fs.readdirAsync(cwd_plugins_path())
    .filter(is_plugin)
    .then(execute_plugins(plugins, config, opts))
    .then(opts.snippets ? add_code_snippets() : passthrough)
    .then(add_ok_issues(allow, ignore))
    .catch(error_executing_plugins)
}

module.exports = {
  exec: run_plugins,
  exec_plugin: run_plugin
}
