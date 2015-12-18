/// <reference path="lib/typings/index.d.ts" />

module vile {

let _ = require("lodash")
let minilog = require("minilog")
let filter = new minilog.Filter()

let default_filter = () => {
  filter.allow(/.*/, "error")
  filter.allow(/.*/, "info")
  filter.defaultResult = false
}

let quiet = () => filter.clear()

let log_level = (level : string) =>
  filter.allow(/.*/, level)

let verbose = (is_verbose : boolean) => {
  if (is_verbose) {
    quiet()
    filter.allow(/.*/, "debug")
  }

  default_filter()
}

let init = () => {
  // HACK!
  let nocolor = _.includes(process.argv, "--nodecorations")

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

module.exports = {
  create: minilog,
  verbose: verbose,
  default: default_filter,
  quiet: quiet,
  level: log_level
}

init()

}
