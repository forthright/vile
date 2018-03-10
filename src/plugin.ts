import path = require("path")
import os = require("os")
import cluster = require("cluster")
import Bluebird = require("bluebird")
import fs = require("fs")
import unixify = require("unixify")
import _ = require("lodash")
import linez = require("linez")
import logger = require("./logger")
import util = require("./util")
import plugin_require = require("./plugin/require")
import PluginNotFoundError = require("./plugin/plugin_not_found_error")

const chalk = require("chalk")

const fs_readdir = Bluebird.promisify(fs.readdir)

const log = logger.create("plugin")

const FILE_EXT = /\.[^\.]*$/

const WORKER_MODULE = path.join(__dirname, "plugin", "worker.js")

// NOTE: defined in package.json dependencies section
const BUNDLED_PLUGINS = [
  "ferret-comment",
  "ferret-coverage",
  "ferret-ncu",
  "ferret-stat"
]

const is_plugin = (name : string) : boolean =>
  !!/^ferret-/.test(name)

const valid_plugin = (api : ferret.Plugin) : boolean =>
  !!(api && typeof api.punish == "function")

const is_array = (list : any[]) : boolean =>
  !!(list && typeof list.forEach == "function")

const is_promise = (list : Bluebird<any>) : boolean =>
  !!(list && typeof list.then == "function")

const map_plugin_name_to_data = (name : string) => (data : ferret.Data[]) =>
  _.map(data, (issue : ferret.Data) => {
    issue.plugin = name
    return issue
  })

const exec_in_fork = (
  plugins : ferret.PluginList,
  config  : ferret.YMLConfig,
  worker  : cluster.Worker
) : Bluebird<ferret.DataList> =>
  new Bluebird((
    resolve : (issue : ferret.DataList) => void,
    reject : (error : string) => void
  ) => {
    worker.on("message", (data : ferret.DataList) => {
      if (data) {
        worker.disconnect()
        resolve(data)
      } else {
        const data : ferret.PluginWorkerData = { config, plugins }
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

const normalize_paths = (data : ferret.DataList) =>
  _.each(data, (issue) => {
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
  plugins : ferret.PluginList
) => {
  _.each(allowed, (name : string) => {
    if (!_.some(plugins, (plugin : string) =>
      plugin.replace("ferret-", "") == name
    )) {
      throw new PluginNotFoundError(
        `${name} is not installed`)
    }
  })
}

const combine_paths = (
  combine_str : string,
  data : ferret.Data[]
) : ferret.Data[] => {
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
    data.forEach((issue : ferret.Data, idx : number) =>  {
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
        _.some(data, (i : ferret.Data) =>
          i && _.has(i, "path") && unixify(i.path) == new_path &&
            i.type == issue_type)

      // HACK: If a lang,stat,comp issue and on base already, drop it
      if (same_data_exists) {
        data[idx] = undefined
      } else {
        _.set(issue, "path", new_path)
      }
    })
  })

  return _.filter(data)
}

const exec_plugin = (
  name : string,
  config : ferret.PluginConfig = {
    config: {},
    ignore: []
  }
) : Bluebird<ferret.DataList> =>
  new Bluebird((
    resolve : (i : ferret.DataList) => void,
    reject : (e : string) => void
  ) => {
    const api : ferret.Plugin = plugin_require.locate(name)

    if (!valid_plugin(api)) reject(`invalid plugin API: ${name}`)

    const data : any = api.punish(config)

    if (is_promise(data)) {
      data
        .then(map_plugin_name_to_data(name))
        .then(resolve)
        .catch(reject) // TODO: keep running other plugins?
    } else if (is_array(data)) {
      resolve(map_plugin_name_to_data(name)(data))
    } else {
      log.warn(`${name} plugin did not return [] or Promise<[]>`)
      resolve([])
    }
  })

const execute_plugins = (
  plugins : ferret.PluginList = [],
  config : ferret.YMLConfig = null,
  opts : ferret.PluginExecOptions = {}
) : Bluebird<ferret.DataList> => {
  cluster.setupMaster({ exec: WORKER_MODULE })

  let plugins_finished = 0
  const plugins_running : { [ name : string ] : boolean } = {}

  const plugin_count : number = plugins.length
  const concurrency : number = os.cpus().length || 1

  const update_spinner = () : void => {
    const percent = _.toNumber(
      plugins_finished / plugin_count * 100).toFixed(0)
    let names : string = _.map(_.keys(
      plugins_running),
      (p) => p.replace(/^ferret-/, "")
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
      .then((data : ferret.Data[]) => {
        plugins_finished += plugins_to_run.length
        _.each(plugins_to_run, (p) => { delete plugins_running[p] })
        update_spinner()
        normalize_paths(data)
        return data
      })
  }, { concurrency })
  .then(_.flatten)
  .then((data : ferret.DataList) => {
    update_spinner()

    if (!_.isEmpty(opts.combine)) {
      data = combine_paths(opts.combine, data)
    }

    // HACK: this should be better, but belongs inside here
    if (opts.dont_post_process) {
      logger.stop_spinner()
      return data
    } else {
      const app_ignore = _.get(config, "ferret.ignore", [])
      const app_allow = _.get(config, "ferret.allow", [])
      const stop_spinner = (list : ferret.DataList) : ferret.DataList => {
        logger.stop_spinner()
        return list
      }

      if (opts.skip_snippets) {
        return add_ok_data(app_allow, app_ignore, data)
          .then(stop_spinner)
      } else {
        return add_code_snippets(data)
          .then((i) => add_ok_data(app_allow, app_ignore, i))
          .then(stop_spinner)
      }
    }
  })
}

// TODO: use Linez typings
const into_snippet = (lines : any, start : number, end : number) =>
  _.reduce(lines, (snippets, line, num) => {
    const num_as_num = _.toNumber(num)
    if (num_as_num > (start - 4) && num_as_num < (end + 2)) {
      snippets.push({
        ending: "\n", // normalize for web
        line: _.get(line, "number"),
        text: _.get(line, "text", " ")
      })
    }
    return snippets
  }, [])

const add_code_snippets = (
  data : ferret.DataList
) : Bluebird<ferret.DataList> =>
  Bluebird.map(_.uniq(_.map(data, "path")), (filepath : string) => {
    if (!(filepath &&
          fs.existsSync(filepath) &&
            fs.lstatSync(filepath).isFile())) return

    const lines = linez(fs.readFileSync(
      path.join(process.cwd(), filepath),
      "utf-8"
    )).lines

    _.each(_.filter(data, (i : ferret.Data) => i.path == filepath),
      (issue : ferret.Data) => {
        const start = Number(_.get(issue, "where.start.line", 0))
        const end = Number(_.get(issue, "where.end.line", start))

        if (issue.type == util.DUPE) {
          const locations : ferret.DuplicateLocations[] = _.
            get(issue, "duplicate.locations", [])

          _.each(locations, (loc : ferret.DuplicateLocations) => {
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
  .then(() => data)

const cwd_plugins_path = () =>
  path.resolve(path.join(process.cwd(), "node_modules"))

const add_ok_data = (
  ferret_allow : ferret.AllowList,
  ferret_ignore : ferret.IgnoreList,
  data : ferret.DataList = []
) : Bluebird<ferret.DataList> =>
  util.promise_each(
    process.cwd(),
    // TODO: don't compile ignore/allow every time
    // NOTE: need to fallthrough if is_dir, in case --gitdiff is set
    (p : string, is_dir : boolean) =>
      (util.allowed(p, ferret_allow) || is_dir) &&
        !util.ignored(p, ferret_ignore)
    ,
    (filepath : string) => util.issue({
      path: unixify(filepath),
      type: util.OK
    }),
    { read_data: false })
  .then((ok_data : ferret.DataList) => {
    const distinct_ok_data = _.reject(ok_data, (issue : ferret.Data) =>
      _.some(data, (i) => i.path == issue.path))
    return distinct_ok_data.concat(data)
  })

const filter_plugins_to_run = (
  peer_installed : ferret.PluginList,
  via_config : ferret.PluginList, // via .ferret.yml
  via_opts : ferret.PluginList, // via CLI opt
  via_force_opts : ferret.PluginList, // for bundling meta pkg bins
  skip_core_plugins : boolean
) : ferret.PluginList => {
  const allowed_plugins : ferret.PluginList = _
    .isEmpty(via_opts) ? via_config : _.concat([], via_opts)

  let available_plugins : ferret.PluginList = skip_core_plugins ?
    peer_installed :
    _.uniq(_.concat(peer_installed, BUNDLED_PLUGINS))

  available_plugins = _.uniq(available_plugins.concat(via_force_opts))

  check_for_uninstalled_plugins(allowed_plugins, available_plugins)

  // TODO: have opt to disable auto adding bundled plugins
  return _.isEmpty(allowed_plugins) ?
    available_plugins :
    _.filter(available_plugins, (p) =>
      _.some(allowed_plugins, (a) => p.replace("ferret-", "") == a))
}

const exec = (
  config : ferret.YMLConfig = {},
  opts : ferret.PluginExecOptions = {}
) : Bluebird<ferret.DataList> => {
  const app_config = _.get(config, "ferret", {})
  const allowed_plugins_via_config : ferret.PluginList = _.get(
    app_config, "plugins", [])
  const allowed_plugins_via_opts : ferret.PluginList = _.get(
    opts, "plugins", [])

  const plugins_path = cwd_plugins_path()

  const allowed_plugins_via_additional_opts : ferret.PluginList = _
    .get(opts, "additional_plugins", [])

  const run = (peer_installed_plugins : ferret.PluginList) =>
    execute_plugins(
      filter_plugins_to_run(
        peer_installed_plugins,
        allowed_plugins_via_config,
        allowed_plugins_via_opts,
        allowed_plugins_via_additional_opts,
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

const module_exports : ferret.Module.Plugin = {
  exec,
  exec_plugin
}

export = module_exports
