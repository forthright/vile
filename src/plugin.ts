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

const chalk = require("chalk")

const log = logger.create("plugin")

const FILE_EXT = /\.[^\.]*$/

const WORKER_MODULE = path.join(__dirname, "plugin", "worker.js")

const valid_plugin = (api : ferret.Plugin) : boolean =>
  !!(api && (typeof api.exec == "function" || api.meta == true))

const is_array = (list : any[]) : boolean =>
  !!(list && typeof list.forEach == "function")

const is_promise = (list : Bluebird<any>) : boolean =>
  !!(list && typeof list.then == "function")

const map_plugin_name_to_data = (name : string) => (data : ferret.Data[]) =>
  _.map(data, (datum : ferret.Data) => {
    datum.plugin = name
    return datum
  })

const exec_in_fork = (
  plugins : ferret.PluginList,
  config  : ferret.YMLConfig,
  worker  : cluster.Worker
) : Bluebird<ferret.DataList> =>
  new Bluebird((
    resolve : (datum : ferret.DataList) => void,
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
  _.each(data, (datum) => {
    if (_.has(datum, "path")) {
      datum.path = unixify(datum.path)

      if (process.cwd() !== ".") {
        datum.path = datum.path
          .replace(process.cwd(), "")
      }

      if (!on_windows()) {
        datum.path = datum.path
          .replace(/^\.\//, "")
          .replace(/^\//, "")
      }
    }
  })

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
    data.forEach((datum : ferret.Data, idx : number) =>  {
      const datum_path = unixify(_.get(datum, "path", ""))
      const datum_type = _.get(datum, "type")

      // if folder base is not same, return
      if (!merge_path_regexp.test(datum_path)) return

      // if lib.js is given, make sure .js is datum path ext
      if (!!merge_path_ext &&
          !_.first(datum_path.match(FILE_EXT)) == !!merge_path_ext) return

      let new_path = datum_path.replace(merge_path_regexp, base_path + "/")
      if (base_path_ext) {
        new_path = new_path.replace(FILE_EXT, base_path_ext)
      }

      // HACK: ugh, such perf datum below
      const potential_data_dupe : boolean = !_.some(
        util.displayable_data,
        (t : string) => t == datum_type)
      // TODO: test this explicitly, especially unixify with non string
      const same_data_exists = potential_data_dupe &&
        _.some(data, (i : ferret.Data) =>
          i && _.has(i, "path") && unixify(i.path) == new_path &&
            i.type == datum_type)

      // HACK: If a lang,stat,comp datum and on base already, drop it
      if (same_data_exists) {
        data[idx] = undefined
      } else {
        _.set(datum, "path", new_path)
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
    log.debug("exec:", name)

    const api : ferret.Plugin = plugin_require.locate(name)

    if (!valid_plugin(api)) {
      return reject(`invalid plugin API: ${name}`)
    }

    if (api.meta) return resolve([])

    const data : any = api.exec(config)

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
      (datum : ferret.Data) => {
        const start = Number(_.get(datum, "where.start.line", 0))
        const end = Number(_.get(datum, "where.end.line", start))

        if (datum.type == util.DUPE) {
          const locations : ferret.DuplicateLocations[] = _.
            get(datum, "duplicate.locations", [])

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

          if (_.some(util.displayable_data, (t) => t == datum.type)) {
            datum.snippet = into_snippet(lines, start, end)
          }
        }
      })
  })
  .then(() => data)

const cwd_plugins_path = () =>
  path.join(process.cwd(), "node_modules")

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
    (filepath : string) => util.data({
      path: unixify(filepath),
      type: util.OK
    }),
    { read_data: false })
  .then((ok_data : ferret.DataList) => {
    const distinct_ok_data = _.reject(ok_data, (datum : ferret.Data) =>
      _.some(data, (i) => i.path == datum.path))
    return distinct_ok_data.concat(data)
  })

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

  log.debug("plugin base:", plugins_path)

  return plugin_require
    .available_modules()
    .then((mods : string[][]) => {
      const installed_plugins = _.map(mods,
        (mod : string[]) =>
        _.last(_.split(mod[0], "/")))

      log.debug("available:", installed_plugins.join(", "))
      log.debug("to run via .ferret.yml =>", allowed_plugins_via_config.join(", "))
      log.debug("to run via opts =>", allowed_plugins_via_opts.join(", "))
      log.debug("to run via additional_opts =>", allowed_plugins_via_additional_opts.join(", "))
      log.debug("skip core plugins =>", !!opts.skip_core_plugins)

      const to_run = plugin_require.filter(
        installed_plugins,
        allowed_plugins_via_config,
        allowed_plugins_via_opts,
        allowed_plugins_via_additional_opts,
        !!opts.skip_core_plugins)

      log.debug("to run: ", to_run.join(", "))

      return execute_plugins(
        to_run,
        config,
        opts)
    })
}

const module_exports : ferret.Module.Plugin = {
  exec,
  exec_plugin
}

export = module_exports
