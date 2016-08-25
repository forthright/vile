/// <reference path="lib/typings/index.d.ts" />

var Bluebird : typeof bluebird.Promise = require("bluebird")
var fs = require("fs")
var path = require("path")
var os = require("os")
var cluster = require("cluster")
var linez = require("linez")
var _ = require("lodash")
var spinner = require("cli-spinner")
var Spinner = spinner.Spinner
var logger : Vile.Lib.Logger  = require("./logger")
var util = require("./util")
var log = logger.create("plugin")

Bluebird.promisifyAll(fs)

const FILE_EXT = /\.[^\.]*$/

var is_plugin = (name) => /^vile-/.test(name)

var valid_plugin = (api) => api && typeof api.punish == "function"

var is_array = (list) => list && typeof list.forEach == "function"

var is_promise = (list) => list && typeof list.then == "function"

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
  issue : Vile.Issue,
  format : string = "default"
) : string => {
  if (format == "syntastic") {
    let t : string = issue.type
    let start_info : Vile.IssueLine
    let synastic_type : string = _
      .some(util.errors, (i) => i.type == t) ? "E" : "W"

    if (t == util.DUPE) {
      let locs = _.get(issue, "duplicate.locations", [])
      start_info = _.get(_.first(locs), "where.start", {})
    } else {
      start_info = _.get(issue, "where.start", {})
    }

    let h_line = _.get(start_info, "line", 1)
    let h_char = _.get(start_info, "character", 1)
    let details = _.has(issue, "title") &&
                  issue.message != issue.title ?
                    `${issue.title} => ${issue.message}` :
                      (issue.message || issue.title)

    return `${ issue.path }:${ h_line }:${ h_char }: ` +
      `${synastic_type}: ${ details }`
  } else {
    let h_line : string = humanize_line_num(issue)
    let h_char : string = humanize_line_char(issue)
    let details : string = _.has(issue, "title") &&
                  issue.message != issue.title ?
                    `${issue.title} => ${issue.message}` :
                      (issue.message || issue.title)
    let loc : string = h_line || h_char ?
      `${ h_line ? "line " + h_line + ", " : "" }` +
      `${ h_char ? "col " + h_char + ", " : "" }` : ""

    let msg : string = `${ issue.path }: ${ loc }${ details }`

    return msg
  }
}

var to_console_duplicate = (
  issue : Vile.Issue
) => {
  let files = _.chain(issue)
    .get("duplicate.locations", [])
    .map("path")
    .uniq()
    .join(", ")
  return `${ issue.path }: Duplicate code in ${ files }`
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

var to_console_stat = (
  issue : Vile.Issue
) => {
  let size = _.get(issue, "stat.size", "?")
  let loc = _.get(issue, "stat.loc", "?")
  let lines = _.get(issue, "stat.loc", "?")
  let comments = _.get(issue, "stat.comment", "?")
  return `${ issue.path } (${ size ? (size / 1024).toFixed(3) + "KB" : "" })` +
    ` - ${ lines } lines, ${ loc } loc, ${ comments } comments`
}

var log_syntastic_applicable_messages = (
  issues : Vile.Issue[] = []
) => {
  issues.forEach((issue : Vile.Issue, index : number) => {
    let issue_type : string = issue.type
    if (_.some(util.displayable_issues, (t) => issue_type == t)) {
      console.log(to_console(issue, "syntastic"))
    }
  })
}

var log_issue_messages = (
  issues : Vile.Issue[] = []
) => {
  let nlogs = {}

  issues.forEach((issue : Vile.Issue, index : number) => {
    let t = issue.type
    if (!nlogs[t]) nlogs[t] = logger.create(t)

    let plugin_name : string = _.get(issue, "plugin")
    let msg_postfix = plugin_name ? ` (vile-${ plugin_name })` : ""

    if (_.some(util.errors, (t) => issue.type == t)) {
      nlogs[t].error(to_console(issue) + msg_postfix)
    } else if (_.some(util.warnings, (t) => issue.type == t)) {
      if (issue.type == util.COMP) {
        nlogs[t].info(to_console_comp(issue) + msg_postfix)
      } else if (issue.type == util.CHURN) {
        nlogs[t].info(to_console_churn(issue) + msg_postfix)
      } else if (issue.type == util.DUPE) {
        nlogs[t].warn(to_console_duplicate(issue) + msg_postfix)
      } else {
        nlogs[t].warn(to_console(issue) + msg_postfix)
      }
    } else {
      if (issue.type == util.LANG) {
        nlogs[t].info(to_console_lang(issue) + msg_postfix)
      } else if (issue.type == util.GIT) {
        nlogs[t].info(to_console_git(issue) + msg_postfix)
      } else if (issue.type == util.STAT) {
        nlogs[t].info(to_console_stat(issue) + msg_postfix)
      } else if (issue.type == util.OK) {
        nlogs[t].info(issue.path + msg_postfix)
      } else {
        nlogs[t].info(to_console(issue) + msg_postfix)
      }
    }
  })
}

var require_plugin = (name : string) : Vile.Plugin => {
  let cwd_node_modules = path.join(process.cwd(), "node_modules")

  try {
    return require(`${cwd_node_modules}/@forthright/vile-${name}`)
  } catch (e) {
    log_error(e)
  }
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

      _.each(plugins, (plugin : string) => {
        log.info(`${ plugin.replace("vile-", "") }:finish`)
      })

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

// TODO: test this to be Windows friendly!
var normalize_paths = (issues) =>
  _.each(issues, (issue) => {
    if (_.has(issue, "path")) {
      issue.path = issue.path
        .replace(process.cwd(), "")

      // HACK: see above todo
      if (!/windows/i.test(os.type())) {
        issue.path = issue.path
          .replace(/^\.\/?/, "")
          .replace(/^\/?/, "")
      }
    }
  })

var check_for_uninstalled_plugins = (
  allowed : string[],
  plugins : Vile.PluginList
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

  if (errors) process.exit(1)
}

var combine_paths = (
  combine_str : string,
  issues : Vile.Issue[]
) : Vile.Issue[] => {
  let combine_paths = _.map(combine_str.split(","),
                            (def : string) => def.split(":"))

  // TODO: don't be lazy with perf here- still preserve layered path changing
  _.each(combine_paths, (paths : string[]) => {
    let [ base, merge ] = paths
    let base_path_ext = _.first(base.match(FILE_EXT))
    let merge_path_ext = _.first(merge.match(FILE_EXT))
    let base_path = base.replace(FILE_EXT, "")
    let merge_path = merge.replace(FILE_EXT, "")
    let merge_path_regexp = new RegExp(`^${merge_path}/`, "i")

    // TODO: Windows support, better matching
    issues.forEach((issue : Vile.Issue, idx : number) =>  {
      let issue_path = _.get(issue, "path", "")
      let issue_type = _.get(issue, "type")

      // if folder base is not same, return
      if (!merge_path_regexp.test(issue_path)) return

      // if lib.js is given, make sure .js is issue path ext
      if (merge_path_ext &&
          !_.first(issue_path.match(FILE_EXT)) == merge_path_ext) return

      let new_path = issue_path.replace(merge_path_regexp, base_path + "/")
      if (base_path_ext) {
        new_path = new_path.replace(FILE_EXT, base_path_ext)
      }

      // HACK: ugh, such perf issue below
      let potential_data_dupe : boolean = !_.some(
        util.displayable_issues,
        (t : string) => t == issue_type)
      let same_data_exists = potential_data_dupe &&
        _.some(issues, (i : Vile.Issue) =>
          i && i.path == new_path && i.type == issue_type)

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

var execute_plugins = (
  allowed : Vile.PluginList = [],
  config : Vile.YMLConfig = null,
  opts : any = {}
) => (plugins : string[]) : bluebird.Promise<any> =>
  new Bluebird((resolve : any, reject) : any => {
    check_for_uninstalled_plugins(allowed, plugins)

    cluster.setupMaster({
      exec: path.join(__dirname, "plugin", "worker.js")
    })

    // TODO: own method
    if (allowed.length > 0) {
      plugins = _.filter(plugins, (p) =>
        _.some(allowed, (a) => p.replace("vile-", "") == a))
    }

    let spin
    let workers = {}
    let plugin_count : number = plugins.length
    let concurrency : number = os.cpus().length || 1

    cluster.on("fork", (worker) => {
      if (spin) spin.stop(true)
      log.info(
        `${workers[worker.id]}:start ` +
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

      if (!_.isEmpty(opts.combine)) {
        issues = combine_paths(opts.combine, issues)
      }

      if (opts.format == "syntastic") {
        log_syntastic_applicable_messages(issues)
      } else if (opts.format != "json") {
        log_issue_messages(issues)
      }

      resolve(issues)
    })
  })

var passthrough = (value : any) => value

// TODO: use Linez typings
var into_snippet = (lines : any, start : number, end : number) =>
  _.reduce(lines, (snippets, line, num) => {
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

var add_code_snippets = () =>
  (issues : Vile.IssueList) =>
    (<any>Bluebird).map(_.uniq(_.map(issues, "path")), (filepath : string) => {
      if (!(filepath &&
            fs.existsSync(filepath) &&
              fs.lstatSync(filepath).isFile())) return

      let lines = linez(fs.readFileSync(
        path.join(process.cwd(), filepath),
        "utf-8"
      )).lines

      _.each(_.filter(issues, (i : Vile.Issue) => i.path == filepath),
        (issue : Vile.Issue) => {
          let start = Number(_.get(issue, "where.start.line", 0))
          let end = Number(_.get(issue, "where.end.line", start))

          if (issue.type == util.DUPE) {
            let locations : Vile.DuplicateLocations[] = _.
              get(issue, "duplicate.locations", [])

            _.each(locations, (loc : Vile.DuplicateLocations) => {
              let start = Number(_.get(loc, "where.start.line", 0))
              let end = Number(_.get(loc, "where.end.line", start))
              if (start === 0 && end === start) return

              if (loc.path == filepath) {
                loc.snippet = into_snippet(lines, start, end)
              } else {
                // HACK: dupe reading here to get this to work with right files
                let alt_lines = linez(fs.readFileSync(
                  path.join(process.cwd(), loc.path),
                  "utf-8"
                )).lines
                loc.snippet = into_snippet(alt_lines, start, end)
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

var cwd_plugins_path = () =>
  path.resolve(path.join(process.cwd(), "node_modules", "@forthright"))

var add_ok_issues = (
  vile_allow  : Vile.AllowList = [],
  vile_ignore : Vile.IgnoreList = [],
  log_distinct_ok_issues = false
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
        _.some(issues, (i) => i.path == issue.path))

      if (log_distinct_ok_issues) {
        log_issue_messages(distinct_ok_issues)
      }

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
  let lookup_ok_issues = !opts.dontpostprocess

  if (app_config.plugins) {
    plugins = _.uniq(plugins.concat(app_config.plugins))
  }

  return fs.readdirAsync(cwd_plugins_path())
    .filter(is_plugin)
    .then(execute_plugins(plugins, config, opts))
    .then(opts.snippets ? add_code_snippets() : passthrough)
    .then(lookup_ok_issues ?
          add_ok_issues(allow, ignore, opts.scores) : passthrough)
    .catch(error_executing_plugins)
}

module.exports = {
  exec: run_plugins,
  exec_plugin: run_plugin
}
