import _ = require("lodash")
import commander = require("commander")
import Bluebird = require("bluebird")
import http = require("http")
import service = require("./../service")
import config = require("./../config")
import git = require("./../git")
import logger = require("./../logger")
import plugin = require("./../plugin")

const log = logger.create("cli")

const service_log = logger.create("vile.io")

const COMMIT_STATUS_INTERVAL_TIME = 2000 // 2s

const log_and_exit = (error : any) : void => {
  log.error(_.get(error, "stack", error))
  process.exit(1)
}

const wait_for = (ms : number, cb : (t : any) => void) => {
  const timer  = setInterval(() => {
    cb(timer)
  }, ms)
}

const wait_for_done_status_and_log = (
  commit_id : number | null,
  auth : vile.Auth
) => {
  wait_for(COMMIT_STATUS_INTERVAL_TIME, (timer) => {
    service
      .commit_status(commit_id, auth)
      .then((http : http.IncomingMessage) => {
        const api_body : vile.Service.HTTPResponse = _.get(http, "body")
        const response : vile.Service.JSONResponse = _.get(
          http, "response", { message: null })

        const status_code = _.get(response, "statusCode")
        const body_json = _.attempt(
          JSON.parse.bind(null, api_body))
        const message = _.get(body_json, "message")
        const data = _.get(body_json, "data")

        if (status_code != 200) {
          clearInterval(timer)
          log.error("http status:", status_code)
          log_and_exit(api_body)
        } else {
          service_log.info(`Commit ${commit_id} ${message}`)

          // TODO: handle when message is garbage (don't assume processing)
          if (message == service.API.COMMIT.FINISHED) {
            clearInterval(timer)
            service.log(data)
          } else if (message == service.API.COMMIT.FAILED) {
            clearInterval(timer)
            log_and_exit(data)
          }
        }
      })
  })
}

const publish = (
  issues : vile.IssueList,
  cli_time : number,
  opts : vile.CLIApp
) => {
  const auth = config.get_auth()

  // HACK: can pass in project via cli arg, or via env var
  if (_.isEmpty(auth.project)) auth.project = opts.upload

  return service
    .commit(issues, cli_time, auth)
    .then((http : http.IncomingMessage) => {
      if (_.get(http, "response.statusCode") != 200) {
        log_and_exit(_.get(http, "body"))
        return
      }

      const body_json = _.attempt(
        JSON.parse.bind(null, _.get(http, "body", "{}")))
      const commit_state = _.get(body_json, "message")
      const commit_id = _.get(body_json, "data.commit_id", null)

      service_log.info(`Commit ${commit_id} ${commit_state}`)

      if (!commit_id) {
        log_and_exit("No commit uid was provided on commit. " +
                        "Can't check status.")
      } else if (!commit_state) {
        log_and_exit("No commit state was provided upon creation. " +
                        "Can't check status.")
      } else if (commit_state == service.API.COMMIT.FAILED) {
        log_and_exit("Creating commit state is failed.")
      } else {
        wait_for_done_status_and_log(commit_id, auth)
      }
    })
}

// HACK: This method and above uses promises haphazardly- needs rewrite
const analyze = (app : any, paths : string[]) : void => {
  const custom_plugins = typeof app.plugins == "string" ?
    _.compact(_.split(app.plugins, ",")) : []

  // TODO: not ideal to mutate the app
  _.merge(app, {
    config: config.get(),
    plugins: custom_plugins,
    spinner: !(app.quiet || app.nodecorations)
  })

  if (!_.isEmpty(paths)) {
    _.set(app, "config.vile.allow", paths)
  }

  const cli_start_time = new Date().getTime()

  // TODO: don't pass in app, instead hardcode new opts (when using CC)
  const exec = () => plugin
    .exec(app.config, app)
    .then((issues : vile.IssueList) => {
      const cli_end_time = new Date().getTime()
      const cli_time = cli_end_time - cli_start_time
      if (app.upload) return publish(issues, cli_time, app)
      if (app.format == "json") {
        process.stdout.write(JSON.stringify(issues))
      }
      return Bluebird.resolve()
    })
    .catch(log_and_exit)

  if (app.gitdiff) {
    const rev = typeof app.gitdiff == "string" ?
      app.gitdiff : undefined
    log.info("git diff:")
    git.changed_files(rev).then((changed_paths : string[]) => {
      _.each(changed_paths, (p : string) => { log.info("", p) })
      _.set(app, "config.vile.allow", changed_paths)
      exec()
    })
  } else {
    exec()
  }
}

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("analyze [paths...]")
    .alias("a")
    .option("-p, --plugins [plugin_list]",
            `unless specified in config, this can be a comma delimited ` +
            `string, else run all installed plugins`)
    .option("-c, --config [path]",
            "specify a custom config file")
    .option("-f, --format [type]",
            "specify output format (console=default,json,syntastic)")
    .option("-u, --upload [project_name]",
            "publish to vile.io (disables --gitdiff)- " +
              "alternatively, you can set a VILE_PROJECT env var")
    .option("-x, --combine [combine_def]",
            "combine file data from two directories into one path- " +
              "example: [src:lib,...] or [src.ts:lib.js,...]")
    .option("-s, --skipsnippets",
            "don't include code snippets")
    .option("-d, --dontpostprocess",
            "don't post process data in any way (ex: adding ok issues)- " +
            "useful for per file checking- don't use with --upload")
    .option("-g, --gitdiff [rev]",
            "only check files patched in latest HEAD commit, or rev")
    .option("-l, --log [level]",
            "specify the log level (info=default|warn|error)")
    .option("-q, --quiet", "log nothing")
    .option("-n, --nodecorations", "disable color and progress bar")
    .action((paths : string[], opts : vile.CLIApp) => {
      logger.enable(!opts.nodecorations)

      config.load(opts.config)

      if (opts.quiet || opts.format == "json" ||
          opts.format == "syntastic") logger.disable()

      if (opts.log) logger.level(opts.log)

      analyze(opts, paths)
    })

export = { create }
