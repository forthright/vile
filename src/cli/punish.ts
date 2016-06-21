/// <reference path="../lib/typings/index.d.ts" />

var Bluebird : typeof bluebird.Promise = require("bluebird")
var _                          = require("lodash")
var fs                         = require("fs")
var service : Vile.Lib.Service = require("./../service")
var vile    : Vile.Lib.Index   = require("./../index")
var path                       = require("path")
var config  : Vile.Lib.Config  = require("./../config")
var git                        = require("./../git")
var util                       = require("./../util")
var logger  : Vile.Lib.Logger  = require("./../logger")

var service_log = logger.create("vile.io")

var COMMIT_STATUS_INTERVAL_TIME = 2000 // 2s
var DEFAULT_VILE_YML            = ".vile.yml"

var wait_for_done_status = (commit_id : number, auth : any) =>
  new Bluebird((resolve, reject) => {
    // HACK: this is not consistent, and network latency will mess this
    let id = setInterval(() => {
      service
        .commit_status(commit_id, auth)
        .then((http) => {
          let status_code = _.get(http, "response.statusCode")
          let body_json = _.attempt(
            JSON.parse.bind(null, _.get(http, "body", "{}")))
          let message = _.get(body_json, "message")
          let data = _.get(body_json, "data")

          if (status_code != 200) {
            if (message) {
              service_log.info(`Commit: ${commit_id} ${message}`)
            } else {
              service_log.error("http status:", status_code)
              service_log.error(http.body)
            }
            clearInterval(id)
            reject(data)
          } else {
            service_log.info(`Commit ${commit_id} ${message}`)

            if (message == util.API.COMMIT.FINISHED) {
              clearInterval(id)
              resolve(data)
            } else if (message == util.API.COMMIT.FAILED) {
              clearInterval(id)
              reject(data)
            }
          }
        })
    }, COMMIT_STATUS_INTERVAL_TIME)
  })

var publish = (issues : Vile.IssueList, cli_time : number, opts : any) => {
  let auth = config.get_auth()

  // HACK: can pass in project via cli arg, or via env var
  if (_.isEmpty(auth.project)) auth.project = opts.upload

  return service
    .commit(issues, cli_time, auth)
    .then((http) => {
      if (_.get(http, "response.statusCode") != 200) {
        // TODO: move log and error handling to inside service module
        service_log.error(_.get(http, "body"))
        return
      }

      let body_json = _.attempt(
        JSON.parse.bind(null, _.get(http, "body", "{}")))
      let commit_state = _.get(body_json, "message")
      let commit_id = _.get(body_json, "data.commit_id")

      service_log.info(`Commit ${commit_id} ${commit_state}`)

      if (!commit_id) {
        throw new Error("No commit uid was provided on commit. " +
                        "Can't check status.")
      } else if (!commit_state) {
        throw new Error("No commit state was provided upon creation. " +
                        "Can't check status.")
      } else if (commit_state == util.API.COMMIT.FAILED) {
        throw new Error("Creating commit state is failed.")
      } else {
        return wait_for_done_status(commit_id, auth)
          .then((data) =>
            service.log(data, opts.scores))
      }
    })
    .catch((err) => {
      console.log() // newline because spinner is running
      // HACK: not the best logging of errors here
      service_log.error(_.get(err, "stack") ||
                _.get(err, "message") ||
                JSON.stringify(err))
    })
}

// TODO: plugin interface
var parse_plugins = (plugins : string) : Vile.PluginList =>
  plugins && plugins.split ? plugins.split(",") : undefined

var set_log_levels = (logs? : string) => {
  logger.quiet()
  if (logs.split) logs.split(",").forEach(logger.level)
}

var punish = (app : any, paths : string[]) => {
  let plugins : string = app.plugins

  // TODO: not ideal to mutate the app
  _.merge(app, {
    spinner: !(app.quiet || app.nodecorations),
    config: config.get()
  })

  if (!_.isEmpty(paths)) {
    let vile_allow = _.get(app, "config.vile.allow")
    let allow = _.isEmpty(paths) ? [] : paths
    if (!_.isEmpty(vile_allow)) allow = allow.concat(vile_allow)
    _.set(app, "config.vile.allow", allow)
  }

  let cli_start_time = new Date().getTime()

  let exec = () => vile
    .exec(parse_plugins(plugins), app.config, app)
    .then((issues : Vile.IssueList) => {
      let cli_end_time = new Date().getTime()
      let cli_time = cli_end_time - cli_start_time
      if (app.upload) return publish(issues, cli_time, app)
      if (app.format == "json")
        process.stdout.write(JSON.stringify(issues))
    })

  if (app.gitdiff) {
    let rev = typeof app.gitdiff == "string" ?
      app.gitdiff : undefined
    git.changed_files(rev).then((paths : string[]) => {
      _.set(app, "config.vile.allow", paths)
      exec()
    })
  } else {
    exec()
  }
}

// TODO: move into config.ts
var load_config = (app : any) => {
  let app_config : string

  if (typeof app.config == "string") {
    app_config = app.config
  // TODO: make into const/config
  } else {
    app_config = DEFAULT_VILE_YML
  }

  // HACK: weird check because should be silent if checking for default
  if (fs.existsSync(app_config) || app_config != DEFAULT_VILE_YML) {
    config.load(path.join(process.cwd(), app_config))
  }
}

// TODO: any is Commander.js
var create = (cli : any) =>
  cli
    .command("punish [paths...]")
    .alias("p")
    .option("-p, --plugins [plugin_list]",
            `unless specified in config, this can be a comma delimited` +
            `string, else run all installed plugins`)
    .option("-c, --config [path]",
            "specify a custom config file")
    .option("-f, --format [type]",
            "specify output format (color=default,json)")
    .option("-u, --upload [project_name]",
            "publish to vile.io (disables --gitdiff)- " +
              "alternatively, you can set a VILE_PROJECT env var")
    .option("-s, --scores",
            "show file scores and detailed stats")
    .option("-i, --snippets",
            "add code snippets to issues")
    .option("-g, --gitdiff [rev]",
            "only check files patched in latest HEAD commit, or rev")
    .option("-l, --log [level]",
            "specify the log level (info|warn|error|debug)")
    .option("-q, --quiet",
            "log nothing")
    .option("-v, --verbose",
            "log all the things")
    .option("--nodecorations", "disable color and progress bar")
    .action((paths, app) => {
      load_config(app)
      // TODO: do this globally
      if (app.verbose) logger.verbose(true)
      if (app.quiet || app.format == "json") logger.quiet()
      if (app.log) set_log_levels(app.log)
      punish(app, paths)
    })

module.exports = {
  create: create
}
