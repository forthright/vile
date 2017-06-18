import _ = require("lodash")
import chalk = require("chalk")
import log = require("loglevel")

let enable_colors : boolean = false

const level = (name : string) : void => {
  log.setLevel(name)
}

const enable = (colors = true) : void => {
  enable_colors = colors
  // HACK: supports auto setting color in worker procs via the CLI
  if (process.env.VILE_NO_COLOR == "1") enable_colors = false
  if (!enable_colors) process.env.VILE_NO_COLOR = "1"
  log.setLevel("info")
}

const disable = () : void => {
  log.setLevel("silent")
}

const colorize = (
  name : string,
  prefix : string,
  logs : string[]
) : string[] => {
  if (enable_colors) {
    prefix = chalk.gray(prefix)

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

  return _.concat([], prefix, name, logs)
}

const apply = (
  name : string,
  prefix : string
) => (...logs : any[]) : void => {
  switch (name) {
    case "warn":
      log.warn.apply(log, colorize(name, prefix, logs))
      break
    case "error":
      log.error.apply(log, colorize(name, prefix, logs))
      break
    default:
      log.info.apply(log, colorize(name, prefix, logs))
      break
  }
}

const apply_issue = (
  name : string,
  prefix : string
) => (...logs : any[]) : void => {
  if (log.getLevel() == LogLevel.INFO) {
    log.info.apply(log, colorize(name, prefix, logs))
  }
}

const create = (
  prefix : string
) : vile.LoggerInstance => {
  return {
    error: apply("error", prefix),
    error_stdout: apply_issue("error", prefix),
    info:  apply("info", prefix),
    warn:  apply("warn", prefix),
    warn_stdout: apply_issue("warn", prefix),
  }
}

enable()

export = {
  create,
  disable,
  enable,
  level
}
