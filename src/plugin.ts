import path = require("path")
import os = require("os")
import cluster = require("cluster")
import Bluebird = require("bluebird")
import fs = require("fs")
import unixify = require("unixify")
import _ = require("lodash")
import linez = require("linez")
import spinner = require("cli-spinner")
import logger = require("./logger")
import util = require("./util")
import log_helper = require("./plugin/log_helper")

Bluebird.promisifyAll(fs)

const log = logger.create("plugin")

const FILE_EXT = /\.[^\.]*$/

const is_plugin = (name : string) : boolean =>
  !!/^vile-/.test(name)

const valid_plugin = (api : vile.Plugin) : boolean =>
  !!(api && typeof api.punish == "function")

const is_array = (list : any[]) : boolean =>
  !!(list && typeof list.forEach == "function")

const is_promise = (list : Bluebird<any>) : boolean =>
  !!(list && typeof list.then == "function")

const require_plugin = (name : string) : vile.Plugin | null => {
  const cwd_node_modules = path.join(process.cwd(), "node_modules")

  let plugin : vile.Plugin

  try {
    plugin = require(`${cwd_node_modules}/vile-${name}`)
  } catch (error) {
    log.error(_.get(error, "stack", error))
  }

  return plugin
}

const map_plugin_name_to_issues = (name : string) => (issues : vile.Issue[]) =>
  _.map(issues, (issue : vile.Issue) =>
    (issue.plugin = name, issue))

const exec_plugin = (
  name : string,
  config : vile.PluginConfig = {
    config: {},
    ignore: []
  }
) : Bluebird<vile.IssueList> =>
  new Bluebird((
    resolve : (i : vile.IssueList) => void,
    reject : (e : string) => void
  ) => {
    const api : vile.Plugin = require_plugin(name)

    if (!valid_plugin(api)) reject(`invalid plugin API: ${name}`)

    const issues : any = api.punish(config)

    if (is_promise(issues)) {
      issues
        .then(map_plugin_name_to_issues(name))
        .then(resolve)
        .catch(reject) // TODO: keep running other plugins?
    } else if (is_array(issues)) {
      resolve(map_plugin_name_to_issues(name)(issues))
    } else {
      console.warn(`${name} plugin did not return [] or Promise<[]>`)
      resolve([])
    }
  })

const log_plugins_finished = (pkg_names : string[]) => {
  _.each(pkg_names, (plugin_name : string) => {
    log.info(`${ plugin_name.replace("vile-", "") }:finish`)
  })
}

const exec_in_fork = (
  plugins : vile.PluginList,
  config  : vile.YMLConfig,
  worker  : cluster.Worker
) : Bluebird<vile.IssueList> =>
  new Bluebird((
    resolve : (issue : vile.IssueList) => void,
    reject : (error : string) => void
  ) => {
    worker.on("message", (issues : vile.IssueList) => {
      if (issues) {
        worker.disconnect()
        resolve(issues)
      } else {
        const data : vile.Lib.PluginWorkerData = { config, plugins }
        worker.send(data)
      }
    })

    worker.on("exit", (code, signal) => {
      const name = plugins.join(",")

      if (signal || code !== 0) {
        reject(`${name} worker exited [code = ${code} | sig = ${signal}]`)
      }
    })
  })

const on_windows = () : boolean => /windows/i.test(os.type())

const normalize_paths = (issues : vile.IssueList) =>
  _.each(issues, (issue) => {
    if (_.has(issue, "path")) {
      issue.path = unixify(issue.path)

      if (process.cwd() !== ".") {
        issue.path = issue.path
          .replace(process.cwd(), "")
      }

      if (!on_windows()) {
        issue.path = issue.path
          .replace(/^\.\//, "")
          .replace(/^\//, "")
      }
    }
  })

const check_for_uninstalled_plugins = (
  allowed : string[],
  plugins : vile.PluginList
) => {
  let errors = false

  _.each(allowed, (name : string) => {
    if (!_.some(plugins, (plugin : string) =>
      plugin.replace("vile-", "") == name
    )) {
      errors = true
      log.error(`${name} is not installed`)
    }
  })

  // Hack: should be doing this in cli modules
  if (errors) process.exit(1)
}

const combine_paths = (
  combine_str : string,
  issues : vile.Issue[]
) : vile.Issue[] => {
  const sanitized_combine_paths = _.map(combine_str.split(","),
                            (def : string) => def.split(":"))

  // TODO: don't be lazy with perf here- still preserve layered path changing
  _.each(sanitized_combine_paths, (paths : string[]) => {
    const base = paths[0]
    const merge = paths[1]
    const base_path_ext = _.first(base.match(FILE_EXT))
    const merge_path_ext = _.first(merge.match(FILE_EXT))
    const base_path = base.replace(FILE_EXT, "")
    const merge_path = merge.replace(FILE_EXT, "")
    const merge_path_regexp = new RegExp(`^${merge_path}/`, "i")

    // TODO: Windows support, better matching
    issues.forEach((issue : vile.Issue, idx : number) =>  {
      const issue_path = unixify(_.get(issue, "path", ""))
      const issue_type = _.get(issue, "type")

      // if folder base is not same, return
      if (!merge_path_regexp.test(issue_path)) return

      // if lib.js is given, make sure .js is issue path ext
      if (!!merge_path_ext &&
          !_.first(issue_path.match(FILE_EXT)) == !!merge_path_ext) return

      let new_path = issue_path.replace(merge_path_regexp, base_path + "/")
      if (base_path_ext) {
        new_path = new_path.replace(FILE_EXT, base_path_ext)
      }

      // HACK: ugh, such perf issue below
      const potential_data_dupe : boolean = !_.some(
        util.displayable_issues,
        (t : string) => t == issue_type)
      // TODO: test this explicitly, especially unixify with non string
      const same_data_exists = potential_data_dupe &&
        _.some(issues, (i : vile.Issue) =>
          i && _.has(i, "path") && unixify(i.path) == new_path &&
            i.type == issue_type)

      // HACK: If a lang,stat,comp issue and on base already, drop it
      if (same_data_exists) {
        issues[idx] = undefined
      } else {
        _.set(issue, "path", new_path)
      }
    })
  })

  return _.filter(issues)
}

const execute_plugins = (
  allowed : vile.PluginList = [],
  config : vile.YMLConfig = null,
  opts : vile.PluginExecOptions = {}
) => (plugins : string[]) : Bluebird<vile.IssueList> =>
  new Bluebird((
    resolve : (issue : vile.IssueList) => void,
    reject : (error : string) => void
  ) => {
    check_for_uninstalled_plugins(allowed, plugins)

    cluster.setupMaster({
      exec: path.join(__dirname, "plugin", "worker.js")
    })

    // TODO: own method
    if (allowed.length > 0) {
      plugins = _.filter(plugins, (p) =>
        _.some(allowed, (a) => p.replace("vile-", "") == a))
    }

    let spin : spinner.Spinner
    const workers : { [ id : string ] : string } = {}
    const plugin_count : number = plugins.length
    const concurrency : number = os.cpus().length || 1

    cluster.on("fork", (worker : cluster.Worker) => {
      if (spin) spin.stop(true)
      const name = workers[worker.id]
      log.info(`${name}:start(${worker.id}/${plugin_count})`)
      if (spin) spin.start()
    })

    if (opts.spinner && opts.format != "json") {
      spin = new spinner.Spinner("PUNISH")
      spin.setSpinnerDelay(60)
      spin.start()
    }

    Bluebird.map(plugins, (plugin : string) => {
      const worker = cluster.fork()
      const plugins_to_run : string[] = [ plugin ]
      workers[worker.id] = plugin.replace("vile-", "")
      return exec_in_fork(plugins_to_run, config, worker)
        .then((issues : vile.Issue[]) => {
          if (spin) spin.stop(true)
          log_plugins_finished(plugins_to_run)
          if (spin) spin.start()
          normalize_paths(issues)
          return issues
        })
    }, { concurrency })
    .then(_.flatten)
    .then((issues : vile.Issue[]) => {
      if (spin) spin.stop(true)

      log.info(`plugins:finish`)

      if (!_.isEmpty(opts.combine)) {
        issues = combine_paths(opts.combine, issues)
      }

      if (opts.format == "syntastic") {
        log_helper.syntastic_issues(issues)
      } else if (opts.format != "json") {
        log_helper.issues(issues)
      }

      resolve(issues)
    })
    .catch(reject)
  })

const passthrough = (issues : vile.IssueList) => issues

// TODO: use Linez typings
const into_snippet = (lines : any, start : number, end : number) =>
  _.reduce(lines, (snippets, line, num) => {
    if ((num > (start - 4) && num < (end + 2))) {
      snippets.push({
        ending: "\n", // normalize for web
        line: _.get(line, "number"),
        text: _.get(line, "text", " ")
      })
    }
    return snippets
  }, [])

const add_code_snippets = () =>
  (issues : vile.IssueList) =>
    Bluebird.map(_.uniq(_.map(issues, "path")), (filepath : string) => {
      if (!(filepath &&
            fs.existsSync(filepath) &&
              fs.lstatSync(filepath).isFile())) return

      const lines = linez(fs.readFileSync(
        path.join(process.cwd(), filepath),
        "utf-8"
      )).lines

      _.each(_.filter(issues, (i : vile.Issue) => i.path == filepath),
        (issue : vile.Issue) => {
          const start = Number(_.get(issue, "where.start.line", 0))
          const end = Number(_.get(issue, "where.end.line", start))

          if (issue.type == util.DUPE) {
            const locations : vile.DuplicateLocations[] = _.
              get(issue, "duplicate.locations", [])

            _.each(locations, (loc : vile.DuplicateLocations) => {
              const sub_start = Number(_.get(loc, "where.start.line", 0))
              const sub_end = Number(_.get(loc, "where.end.line", sub_start))
              if (sub_start === 0 && end === sub_end) return

              if (loc.path == filepath) {
                loc.snippet = into_snippet(lines, sub_start, sub_end)
              } else {
                // HACK: dupe reading here to get this to work with right files
                const alt_lines = linez(fs.readFileSync(
                  path.join(process.cwd(), loc.path),
                  "utf-8"
                )).lines
                loc.snippet = into_snippet(alt_lines, sub_start, sub_end)
              }
            })
          } else {
            if (start === 0 && end === start) return

            if (_.some(util.displayable_issues, (t) => t == issue.type)) {
              issue.snippet = into_snippet(lines, start, end)
            }
          }
        })
    })
    .then(() => issues)

const cwd_plugins_path = () =>
  path.resolve(path.join(process.cwd(), "node_modules"))

const add_ok_issues = (
  vile_allow : vile.AllowList = [],
  vile_ignore : vile.IgnoreList = [],
  log_distinct_ok_issues = false
) =>
  (issues : vile.IssueList) =>
    util.promise_each(
      process.cwd(),
      // TODO: don't compile ignore/allow every time
      // NOTE: need to fallthrough if is_dir, in case --gitdiff is set
      (p : string, is_dir : boolean) =>
        (util.allowed(p, vile_allow) || is_dir) &&
          !util.ignored(p, vile_ignore)
      ,
      (filepath : string) => util.issue({
        path: unixify(filepath),
        type: util.OK
      }),
      { read_data: false })
    .then((ok_issues : vile.IssueList) => {
      const distinct_ok_issues = _.reject(ok_issues, (issue : vile.Issue) =>
        _.some(issues, (i) => i.path == issue.path))

      if (log_distinct_ok_issues) {
        log_helper.issues(distinct_ok_issues)
      }

      return distinct_ok_issues.concat(issues)
    })

const log_post_process = (state : string) =>
  (issues : vile.IssueList) : vile.IssueList => {
    log.info(`postprocess:${state}`)
    return issues
  }

const exec = (
  custom_plugins : vile.PluginList = [],
  config : vile.YMLConfig = {},
  opts : vile.PluginExecOptions = {}
) : Bluebird<vile.IssueList> => {
  const app_config = _.get(config, "vile", { plugins: [] })
  const ignore = _.get(app_config, "ignore", null)
  const allow = _.get(app_config, "allow", null)
  let plugins : vile.PluginList = custom_plugins
  const post_process = !opts.dontpostprocess

  if (app_config.plugins) {
    plugins = _.uniq(plugins.concat(app_config.plugins))
  }

  return (fs as any).readdirAsync(cwd_plugins_path())
    .filter(is_plugin)
    .then(execute_plugins(plugins, config, opts))
    .then(post_process ? log_post_process("start") : passthrough)
    .then(opts.snippets ? add_code_snippets() : passthrough)
    .then(post_process ?
          add_ok_issues(allow, ignore, opts.scores) : passthrough)
    .then(post_process ? log_post_process("finish") : passthrough)
}

export = {
  exec,
  exec_plugin
} as vile.Lib.Plugin
