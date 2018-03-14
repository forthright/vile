import _ = require("lodash")
import log = require("loglevel")
import ora = require("ora")

// HACK: types fail lookup when using import
const chalk = require("chalk")

let enable_colors : boolean = false
let allow_data_types : ferret.DataType.All[] = []

// HACK: need to get exported ora types
const spin : any = ora({ color: "green" })

const stop_spinner = () : void => {
  spin.stop()
}

const start_spinner = () : void => {
  if (enable_colors) spin.start()
}

const update_spinner = (text : string) : void => {
  spin.text = text
  start_spinner()
}

const level = (name : string) : void => {
  process.env.FERRET_LOG_LEVEL = name
  // HACK: weird dual type (num/string) data with log.LogLevel
  log.setLevel(<any>name)
}

const enable = (
  colors = true,
  data_types : ferret.DataType.All[] = []
) : void => {
  allow_data_types = data_types
  enable_colors = colors

  // HACK: supports auto setting color/log in worker procs for CLI
  if (process.env.FERRET_NO_COLOR == "1") enable_colors = false
  if (!enable_colors) process.env.FERRET_NO_COLOR = "1"

  level(process.env.FERRET_LOG_LEVEL || "info")
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
      case "debug":
        name = chalk.red(name)
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
    case "debug":
      log.debug.apply(log, colorize(name, source, logs))
      break
    default:
      log.info.apply(log, colorize(name, source, logs))
      break
  }
}

const apply_data = (
  name : string,
  source : string
) => (...logs : any[]) : void => {
  if ((_.isEmpty(allow_data_types) ||
      _.some(allow_data_types, (t) => t == source))) {
    log.info.apply(log, colorize(name, source, logs))
  }
}

const create = (
  source : string
) : ferret.LoggerInstance => {
  return {
    error:       apply("error", source),
    error_data:  apply_data("error", source),
    info:        apply("info", source),
    info_data:   apply_data("info", source),
    warn:        apply("warn", source),
    warn_data:   apply_data("warn", source),
    debug:       apply("debug", source),
    debug_data:  apply_data("debug", source)
  }
}

const api : ferret.Module.Logger = {
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
