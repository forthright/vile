import _ = require("lodash")
import minilog = require("minilog")

let filter = new minilog.Filter()

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
  let nocolor = _.includes(process.argv, "--nodecorations") ||
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

export = <vile.Lib.Logger>{
  create: minilog,
  default: default_filter,
  quiet: quiet,
  level: log_level
}

init()
