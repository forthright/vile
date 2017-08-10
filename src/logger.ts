import _ = require("lodash")
import chalk = require("chalk")
import log = require("loglevel")
import ora = require("ora")

let enable_colors : boolean = false
let allow_issue_types : vile.IssueType.All[] = []

// HACK: need to get exported ora types
const spin : any = ora({ color: "green" })

const stop_spinner = () : void => {
  spin.stop()
}

const start_spinner = () : void => {
  spin.start()
}

const update_spinner = (text : string) : void => {
  spin.text = text
  start_spinner()
}

const level = (name : string) : void => {
  process.env.VILE_LOG_LEVEL = name
  log.setLevel(name)
}

const enable = (
  colors = true,
  issue_types : vile.IssueType.All[] = []
) : void => {
  allow_issue_types = issue_types
  enable_colors = colors

  // HACK: supports auto setting color/log in worker procs for CLI
  if (process.env.VILE_NO_COLOR == "1") enable_colors = false
  if (!enable_colors) process.env.VILE_NO_COLOR = "1"

  level(process.env.VILE_LOG_LEVEL || "info")
}

const disable = () : void => {
  level("silent")
}

const colorize = (
  name : string,
  source : string,
  logs : string[]
) : string[] => {
  if (enable_colors) {
    source = chalk.gray(source)

    switch (name) {
      case "error":
        name = chalk.red(name)
        break
      case "warn":
        name = chalk.yellow(name)
        break
      default:
        name = chalk.cyan(name)
        break
    }
  }

  return _.concat([], name, source, logs)
}

const apply = (
  name : string,
  source : string
) => (...logs : any[]) : void => {
  stop_spinner()

  switch (name) {
    case "warn":
      log.warn.apply(log, colorize(name, source, logs))
      break
    case "error":
      log.error.apply(log, colorize(name, source, logs))
      break
    default:
      log.info.apply(log, colorize(name, source, logs))
      break
  }
}

const apply_issue = (
  name : string,
  source : string
) => (...logs : any[]) : void => {
  if ((_.isEmpty(allow_issue_types) ||
      _.some(allow_issue_types, (t) => t == source))) {
    log.info.apply(log, colorize(name, source, logs))
  }
}

const create = (
  source : string
) : vile.LoggerInstance => {
  return {
    error:       apply("error", source),
    error_issue: apply_issue("error", source),
    info:        apply("info", source),
    info_issue:  apply_issue("info", source),
    warn:        apply("warn", source),
    warn_issue:  apply_issue("warn", source)
  }
}

const api : vile.Module.Logger = {
  create,
  disable,
  enable,
  level,
  start_spinner,
  stop_spinner,
  update_spinner
}

enable()

export = api
