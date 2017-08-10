import path = require("path")
import os = require("os")
import chalk = require("chalk")
import cluster = require("cluster")
import Bluebird = require("bluebird")
import fs = require("fs")
import unixify = require("unixify")
import _ = require("lodash")
import linez = require("linez")
import logger = require("./logger")
import util = require("./util")
import PluginNotFoundError = require("./plugin/plugin_not_found_error")

const fs_readdir = Bluebird.promisify(fs.readdir)

const log = logger.create("plugin")

const FILE_EXT = /\.[^\.]*$/

// NOTE: defined in package.json dependencies section
const BUNDLED_PLUGINS = [
  "vile-comment",
  "vile-coverage",
  "vile-ncu",
  "vile-stat"
]

const is_plugin = (name : string) : boolean =>
  !!/^vile-/.test(name)

const valid_plugin = (api : vile.Plugin) : boolean =>
  !!(api && typeof api.punish == "function")

const is_array = (list : any[]) : boolean =>
  !!(list && typeof list.forEach == "function")

const is_promise = (list : Bluebird<any>) : boolean =>
  !!(list && typeof list.then == "function")

const map_plugin_name_to_issues = (name : string) => (issues : vile.Issue[]) =>
  _.map(issues, (issue : vile.Issue) => {
    issue.plugin = name
    return issue
  })

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
        const data : vile.PluginWorkerData = { config, plugins }
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
  _.each(allowed, (name : string) => {
    if (!_.some(plugins, (plugin : string) =>
      plugin.replace("vile-", "") == name
    )) {
      throw new PluginNotFoundError(
        `${name} is not installed`)
    }
  })
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

const cannot_find_module = (
  err : NodeJS.ErrnoException | string
) : boolean =>
  /cannot find module/i.test(
    _.get(err, "stack", (err as string)))

const require_plugin = (name : string) : vile.Plugin => {
  const cwd_node_modules = path.join(process.cwd(), "node_modules")
  const module_name = `vile-${name}`
  const module_name_cwd_node_modules = `${cwd_node_modules}/${module_name}`

  let plugin : vile.Plugin

  try {
    // CWD first (in case a bundled plugin is also user installed)
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
      log.warn(`${name} plugin did not return [] or Promise<[]>`)
      resolve([])
    }
  })

const execute_plugins = (
  plugins : vile.PluginList = [],
  config : vile.YMLConfig = null,
  opts : vile.PluginExecOptions = {}
) : Bluebird<vile.IssueList> => {
  cluster.setupMaster({
    exec: path.join(__dirname, "plugin", "worker.js")
  })

  let plugins_finished = 0
  const plugins_running : { [ name : string ] : boolean } = {}

  const plugin_count : number = plugins.length
  const concurrency : number = os.cpus().length || 1

  const update_spinner = () : void => {
    const percent = _.toNumber(
      plugins_finished / plugin_count * 100).toFixed(0)
    let names : string = _.map(_.keys(
      plugins_running),
      (p) => p.replace(/^vile-/, "")
    ).join(" + ")
    if (names) names = ` [${names}]`
    logger.update_spinner(chalk.gray(`${percent}%${names}`))
  }

  update_spinner()

  return Bluebird.map(plugins, (plugin : string) => {
    const worker = cluster.fork()
    const plugins_to_run : string[] = [ plugin ]
    _.each(plugins_to_run, (p) => { plugins_running[p] = true })
    update_spinner()
    return exec_in_fork(plugins_to_run, config, worker)
      .then((issues : vile.Issue[]) => {
        plugins_finished += plugins_to_run.length
        _.each(plugins_to_run, (p) => { delete plugins_running[p] })
        update_spinner()
        normalize_paths(issues)
        return issues
      })
  }, { concurrency })
  .then(_.flatten)
  .then((issues : vile.IssueList) => {
    update_spinner()

    if (!_.isEmpty(opts.combine)) {
      issues = combine_paths(opts.combine, issues)
    }

    // HACK: this should be better, but belongs inside here
    if (opts.dont_post_process) {
      logger.stop_spinner()
      return issues
    } else {
      const app_ignore = _.get(config, "vile.ignore", [])
      const app_allow = _.get(config, "vile.allow", [])
      const stop_spinner = (list : vile.IssueList) : vile.IssueList => {
        logger.stop_spinner()
        return list
      }

      if (opts.skip_snippets) {
        return add_ok_issues(app_allow, app_ignore, issues)
          .then(stop_spinner)
      } else {
        return add_code_snippets(issues)
          .then((i) => add_ok_issues(app_allow, app_ignore, i))
          .then(stop_spinner)
      }
    }
  })
}

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

const add_code_snippets = (
  issues : vile.IssueList
) : Bluebird<vile.IssueList> =>
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
  vile_allow : vile.AllowList,
  vile_ignore : vile.IgnoreList,
  issues : vile.IssueList = []
) : Bluebird<vile.IssueList> =>
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
    return distinct_ok_issues.concat(issues)
  })

const filter_plugins_to_run = (
  peer_installed : vile.PluginList,
  via_config : vile.PluginList,
  via_opts : vile.PluginList,
  skip_core_plugins : boolean
) : vile.PluginList => {
  const allowed_plugins : vile.PluginList = _
    .isEmpty(via_opts) ? via_config : _.concat([], via_opts)

  const available_plugins : vile.PluginList = skip_core_plugins ?
    peer_installed :
    _.uniq(_.concat(peer_installed, BUNDLED_PLUGINS))

  check_for_uninstalled_plugins(allowed_plugins, available_plugins)

  // TODO: have opt to disable auto adding bundled plugins
  return _.isEmpty(allowed_plugins) ?
    available_plugins :
    _.filter(available_plugins, (p) =>
      _.some(allowed_plugins, (a) => p.replace("vile-", "") == a))
}

const exec = (
  config : vile.YMLConfig = {},
  opts : vile.PluginExecOptions = {}
) : Bluebird<vile.IssueList> => {
  const app_config = _.get(config, "vile", {})
  const allowed_plugins_via_config : vile.PluginList = _.get(
    app_config, "plugins", [])
  const allowed_plugins_via_opts : vile.PluginList = _.get(
    opts, "plugins", [])

  const plugins_path = cwd_plugins_path()

  const run = (peer_installed_plugins : vile.PluginList) =>
    execute_plugins(
      filter_plugins_to_run(
        peer_installed_plugins,
        allowed_plugins_via_config,
        allowed_plugins_via_opts,
        opts.skip_core_plugins),
      config,
      opts)

  if (fs.existsSync(plugins_path)) {
    return fs_readdir(plugins_path)
      .filter(is_plugin)
      .then(run)
  } else {
    return run([])
  }
}

const module_exports : vile.Module.Plugin = {
  exec,
  exec_plugin
}

export = module_exports
