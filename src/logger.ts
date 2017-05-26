import _ = require("lodash")
import minilog = require("minilog")

const filter = new minilog.Filter()

const default_filter = () => {
  filter.allow(/.*/, "error")
  filter.allow(/.*/, "info")
  filter.defaultResult = false
}

const quiet = () => filter.clear()

const log_level = (level : string) =>
  filter.allow(/.*/, level)

const init = () => {
  // HACK!
  const nocolor = _.includes(process.argv, "--nodecorations") ||
    _.includes(process.argv, "-n")

  if (nocolor) {
    minilog
      .pipe(filter)
      .pipe(minilog.backends.console.formatClean)
      .pipe(minilog.backends.console)
  } else {
    minilog
      .pipe(filter)
      .pipe(minilog.backends.console.formatMinilog)
      .pipe(minilog.backends.console)
  }

  default_filter()
}

export = {
  create: minilog,
  default: default_filter,
  level: log_level,
  quiet
} as vile.Lib.Logger

init()
