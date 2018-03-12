import _ = require("lodash")
import logger = require("./../../logger")
import util = require("./../../util")

// HACK: types fail lookup when using import
const chalk = require("chalk")

const log = logger.create("cli")

// HACK: weird TS bug when using custom types?
const emphasize : any = require("emphasize")

const humanize_line_char = (data : ferret.Data) : string => {
  const start : ferret.DataLine = _.get(data, "where.start", {})
  const end : ferret.DataLine = _.get(data, "where.end", {})

  const start_character : string = (
      typeof start.character == "number" || typeof start.character == "string"
    ) ? String(start.character) : ""

  const end_character : string = (
      typeof end.character == "number" || typeof end.character == "string"
    ) && end.character != start.character ? `-${String(end.character)}` : ""

  return typeof end.character == "number" ?
    `${start_character}${end_character}` : start_character
}

const humanize_line_num = (data : ferret.Data) : string => {
  const start : ferret.DataLine = _.get(data, "where.start", {})
  const end : ferret.DataLine = _.get(data, "where.end", {})

  const start_line : string = (
      typeof start.line == "number" || typeof start.line == "string"
    ) ? String(start.line) : ""

  const end_line : string = (
      typeof end.line == "number" || typeof end.line == "string"
    ) && end.line != start.line ? `-${String(end.line)}` : ""

  return typeof end.line == "number" ?
    `${start_line}${end_line}` : start_line
}

const to_console = (
  data : ferret.Data,
  format : string = "default"
) : string => {
  if (format == "syntastic") {
    const data_type : string = data.type
    let start_info : ferret.DataLine
    const synastic_type : string = _
      .some(util.errors, (name) => name == data_type) ? "E" : "W"

    if (data_type == util.DUPE) {
      const locs = _.get(data, "duplicate.locations", [])
      start_info = _.get(_.first(locs), "where.start", {})
    } else {
      start_info = _.get(data, "where.start", {})
    }

    const h_line = _.get(start_info, "line", 1)
    const h_char = _.get(start_info, "character", 1)
    const details = _.has(data, "title") &&
                  data.message != data.title ?
                    `${data.title} => ${data.message}` :
                      (data.message || data.title)

    return `${ data.path }:${ h_line }:${ h_char }: ` +
      `${synastic_type}: ${ details }`
  } else {
    const h_line : string = humanize_line_num(data)
    const h_char : string = humanize_line_char(data)
    const details : string = _.has(data, "title") &&
                  data.message != data.title ?
                    `${data.title} => ${data.message}` :
                      (data.message || data.title)
    const loc : string = h_line || h_char ?
      `${ h_line ? "line " + h_line + ", " : "" }` +
      `${ h_char ? "col " + h_char + ", " : "" }` : ""

    const data_path = _.isEmpty(data.path) ? "" : `${ data.path }: `

    return `${data_path}${ loc }${ details }`
  }
}

const to_console_duplicate = (
  data : ferret.Data
) => {
  const files = _.chain(
    _.get(data, "duplicate.locations", [])
  ).map("path").uniq().join(", ")
  return `${ data.path }: Similar code in ${ files }`
}

const to_console_churn = (
  data : ferret.Data
) => `${ data.path }: ${ data.churn }`

const to_console_comp = (
  data : ferret.Data
) => `${ data.path }: ${ data.complexity }`

const to_console_scm = (
  data : ferret.Data
) => {
  const date = _.get(data, "commit.commit_date") ||
              _.get(data, "commit.author_date")
  const sha = _.get(data, "commit.sha")
  return `${ sha }: ${ date }`
}

const to_console_stat = (
  data : ferret.Data
) => {
  const size = _.get(data, "stat.size", "?")
  const loc = _.get(data, "stat.loc", "?")
  const lines = _.get(data, "stat.lines", "?")
  const comments = _.get(data, "stat.comments", "?")
  const lang = _.get(data, "stat.language", "?")
  return `${ data.path } ` +
    `(${ size ? (Number(size) / 1024).toFixed(3) + "KB" : "" })` +
    `: ${ lines } lines, ${ loc } loc, ${ comments }` +
    ` comments (language: ${lang})`
}

const to_console_dep = (
  data : ferret.Data
) : string => {
  const name = _.get(data, "dependency.name", "?")
  const current = _.get(data, "dependency.current", "?")
  const latest = _.get(data, "dependency.latest", "?")
  return `New release for ${name}: ${current} < ${latest}`
}

const to_console_cov = (
  data : ferret.Data
) : string => {
  const cov = _.get(data, "coverage.total", "?")
  return `${ data.path }: ${ cov }% lines covered`
}

const log_syntastic_applicable_messages = (
  data : ferret.Data[] = []
) => {
  data.forEach((datum : ferret.Data, index : number) => {
    const data_type : string = datum.type
    if (_.some(util.displayable_data, (t) => data_type == t)) {
      console.log(to_console(datum, "syntastic"))
    }
  })
}

const lines_for = (snippets : ferret.Snippet[]) : string[] => {
  const line_pad = _.toString(
    _.get(_.last(snippets), "line", "3")).length

  return _.map(snippets, (snippet : ferret.Snippet) =>
    `${_.padStart(snippet.line.toString(), line_pad)}: `
  )
}

const code_for = (snippets : ferret.Snippet[]) : string =>
  _.map(
    snippets,
    (snippet : ferret.Snippet) => snippet.text
  ).join("\n")

const log_snippet = (
  lines : any[],
  code : string,
  filepath : string,
  file_ext : string,
  nocolors : boolean
) : void => {
  if (nocolors) {
    console.log(_.zip(lines, code.split("\n"))
      .map((s : any[]) => s.join(" ")).join("\n"))
  } else {
    let colored : string

    try {
      colored = _.get(emphasize
        .highlight(file_ext, code), "value", "")
    } catch (e) {
      log.warn(`highlighting failed for ${filepath}:`)
      colored = code
    }

    const colored_lines = lines.map((l) => chalk.gray(l))
    console.log(_.zip(colored_lines, colored.split("\n"))
      .map((s : any[]) => s.join("")).join("\n"))
  }
}

const to_console_snippet = (
  data : ferret.Data,
  nocolors : boolean
) : void => {
  if (_.isEmpty(data.snippet) && _.isEmpty(data.duplicate)) return

  const filepath : string = _.get(data, "path", "")
  const file_ext = _.first(filepath.match(/[^\.]*$/))

  if (data.type == util.DUPE) {
    _.each(
      _.get(data, "duplicate.locations", []),
      (loc : ferret.DuplicateLocations) => {
        const code = code_for(loc.snippet)
        const lines = lines_for(loc.snippet)
        const loc_filepath : string = _.get(loc, "path", "")
        const loc_file_ext = _.first(loc_filepath.match(/[^\.]*$/))
        console.log()
        log_snippet(lines, code, loc_filepath, loc_file_ext, nocolors)
      })
    console.log()
  } else {
    const code = code_for(data.snippet)
    const lines = lines_for(data.snippet)
    console.log()
    log_snippet(lines, code, filepath, file_ext, nocolors)
    console.log()
  }
}

const log_data_messages = (
  data : ferret.DataList = [],
  showsnippets = false,
  nocolors = false
) => {
  const nlogs : {
    [data_type : string] : ferret.LoggerInstance
  } = {}

  data.forEach((datum : ferret.Data, index : number) => {
    const logger_type : string = datum.type

    if (!nlogs[logger_type]) {
      nlogs[logger_type] = logger.create(logger_type)
    }

    const nlog = nlogs[logger_type]
    const plugin_name : string = _.get(datum, "plugin", "")
    const msg_postfix = plugin_name ? ` (ferret-${ plugin_name })` : ""

    if (_.some(util.errors, (i_type) => datum.type == i_type)) {
      nlog.error_data(to_console(datum) + msg_postfix)
    } else if (_.some(util.warnings, (i_type) => datum.type == i_type)) {
      if (datum.type == util.COMP) {
        nlog.info_data(to_console_comp(datum) + msg_postfix)
      } else if (datum.type == util.CHURN) {
        nlog.info_data(to_console_churn(datum) + msg_postfix)
      } else if (datum.type == util.DEP) {
        nlog.warn_data(to_console_dep(datum) + msg_postfix)
      } else if (datum.type == util.DUPE) {
        nlog.warn_data(to_console_duplicate(datum) + msg_postfix)
      } else {
        nlog.warn_data(to_console(datum) + msg_postfix)
      }
    } else {
      if (datum.type == util.SCM) {
        nlog.info_data(to_console_scm(datum) + msg_postfix)
      } else if (datum.type == util.STAT) {
        nlog.info_data(to_console_stat(datum) + msg_postfix)
      } else if (datum.type == util.COV) {
        nlog.info_data(to_console_cov(datum) + msg_postfix)
      } else if (datum.type == util.OK) {
        // TODO: don't log for now (too annoying for certain user experiences)
      } else {
        nlog.info_data(to_console(datum) + msg_postfix)
      }
    }

    if (showsnippets) {
      to_console_snippet(datum, nocolors)
    }
  })
}

export = {
  issues: log_data_messages,
  syntastic_issues: log_syntastic_applicable_messages,
}
