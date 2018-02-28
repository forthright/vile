import _ = require("lodash")
import logger = require("./../../logger")
import util = require("./../../util")

// HACK: types fail lookup when using import
const chalk = require("chalk")

const log = logger.create("cli")

// HACK: weird TS bug when using custom types?
const emphasize : any = require("emphasize")

const humanize_line_char = (issue : ferret.Issue) : string => {
  const start : ferret.IssueLine = _.get(issue, "where.start", {})
  const end : ferret.IssueLine = _.get(issue, "where.end", {})

  const start_character : string = (
      typeof start.character == "number" || typeof start.character == "string"
    ) ? String(start.character) : ""

  const end_character : string = (
      typeof end.character == "number" || typeof end.character == "string"
    ) && end.character != start.character ? `-${String(end.character)}` : ""

  return typeof end.character == "number" ?
    `${start_character}${end_character}` : start_character
}

const humanize_line_num = (issue : ferret.Issue) : string => {
  const start : ferret.IssueLine = _.get(issue, "where.start", {})
  const end : ferret.IssueLine = _.get(issue, "where.end", {})

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
  issue : ferret.Issue,
  format : string = "default"
) : string => {
  if (format == "syntastic") {
    const issue_type : string = issue.type
    let start_info : ferret.IssueLine
    const synastic_type : string = _
      .some(util.errors, (name) => name == issue_type) ? "E" : "W"

    if (issue_type == util.DUPE) {
      const locs = _.get(issue, "duplicate.locations", [])
      start_info = _.get(_.first(locs), "where.start", {})
    } else {
      start_info = _.get(issue, "where.start", {})
    }

    const h_line = _.get(start_info, "line", 1)
    const h_char = _.get(start_info, "character", 1)
    const details = _.has(issue, "title") &&
                  issue.message != issue.title ?
                    `${issue.title} => ${issue.message}` :
                      (issue.message || issue.title)

    return `${ issue.path }:${ h_line }:${ h_char }: ` +
      `${synastic_type}: ${ details }`
  } else {
    const h_line : string = humanize_line_num(issue)
    const h_char : string = humanize_line_char(issue)
    const details : string = _.has(issue, "title") &&
                  issue.message != issue.title ?
                    `${issue.title} => ${issue.message}` :
                      (issue.message || issue.title)
    const loc : string = h_line || h_char ?
      `${ h_line ? "line " + h_line + ", " : "" }` +
      `${ h_char ? "col " + h_char + ", " : "" }` : ""

    const issue_path = _.isEmpty(issue.path) ? "" : `${ issue.path }: `

    return `${issue_path}${ loc }${ details }`
  }
}

const to_console_duplicate = (
  issue : ferret.Issue
) => {
  const files = _.chain(
    _.get(issue, "duplicate.locations", [])
  ).map("path").uniq().join(", ")
  return `${ issue.path }: Similar code in ${ files }`
}

const to_console_churn = (
  issue : ferret.Issue
) => `${ issue.path }: ${ issue.churn }`

const to_console_comp = (
  issue : ferret.Issue
) => `${ issue.path }: ${ issue.complexity }`

const to_console_scm = (
  issue : ferret.Issue
) => {
  const date = _.get(issue, "commit.commit_date") ||
              _.get(issue, "commit.author_date")
  const sha = _.get(issue, "commit.sha")
  return `${ sha }: ${ date }`
}

const to_console_stat = (
  issue : ferret.Issue
) => {
  const size = _.get(issue, "stat.size", "?")
  const loc = _.get(issue, "stat.loc", "?")
  const lines = _.get(issue, "stat.lines", "?")
  const comments = _.get(issue, "stat.comments", "?")
  const lang = _.get(issue, "stat.language", "?")
  return `${ issue.path } ` +
    `(${ size ? (Number(size) / 1024).toFixed(3) + "KB" : "" })` +
    `: ${ lines } lines, ${ loc } loc, ${ comments }` +
    ` comments (language: ${lang})`
}

const to_console_dep = (
  issue : ferret.Issue
) : string => {
  const name = _.get(issue, "dependency.name", "?")
  const current = _.get(issue, "dependency.current", "?")
  const latest = _.get(issue, "dependency.latest", "?")
  return `New release for ${name}: ${current} < ${latest}`
}

const to_console_cov = (
  issue : ferret.Issue
) : string => {
  const cov = _.get(issue, "coverage.total", "?")
  return `${ issue.path }: ${ cov }% lines covered`
}

const log_syntastic_applicable_messages = (
  issues : ferret.Issue[] = []
) => {
  issues.forEach((issue : ferret.Issue, index : number) => {
    const issue_type : string = issue.type
    if (_.some(util.displayable_issues, (t) => issue_type == t)) {
      console.log(to_console(issue, "syntastic"))
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
  issue : ferret.Issue,
  nocolors : boolean
) : void => {
  if (_.isEmpty(issue.snippet) && _.isEmpty(issue.duplicate)) return

  const filepath : string = _.get(issue, "path", "")
  const file_ext = _.first(filepath.match(/[^\.]*$/))

  if (issue.type == util.DUPE) {
    _.each(
      _.get(issue, "duplicate.locations", []),
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
    const code = code_for(issue.snippet)
    const lines = lines_for(issue.snippet)
    console.log()
    log_snippet(lines, code, filepath, file_ext, nocolors)
    console.log()
  }
}

const log_issue_messages = (
  issues : ferret.Issue[] = [],
  showsnippets = false,
  nocolors = false
) => {
  const nlogs : {
    [issue_type : string] : ferret.LoggerInstance
  } = {}

  issues.forEach((issue : ferret.Issue, index : number) => {
    const logger_type : string = issue.type

    if (!nlogs[logger_type]) {
      nlogs[logger_type] = logger.create(logger_type)
    }

    const nlog = nlogs[logger_type]
    const plugin_name : string = _.get(issue, "plugin", "")
    const msg_postfix = plugin_name ? ` (ferret-${ plugin_name })` : ""

    if (_.some(util.errors, (i_type) => issue.type == i_type)) {
      nlog.error_issue(to_console(issue) + msg_postfix)
    } else if (_.some(util.warnings, (i_type) => issue.type == i_type)) {
      if (issue.type == util.COMP) {
        nlog.info_issue(to_console_comp(issue) + msg_postfix)
      } else if (issue.type == util.CHURN) {
        nlog.info_issue(to_console_churn(issue) + msg_postfix)
      } else if (issue.type == util.DEP) {
        nlog.warn_issue(to_console_dep(issue) + msg_postfix)
      } else if (issue.type == util.DUPE) {
        nlog.warn_issue(to_console_duplicate(issue) + msg_postfix)
      } else {
        nlog.warn_issue(to_console(issue) + msg_postfix)
      }
    } else {
      if (issue.type == util.SCM) {
        nlog.info_issue(to_console_scm(issue) + msg_postfix)
      } else if (issue.type == util.STAT) {
        nlog.info_issue(to_console_stat(issue) + msg_postfix)
      } else if (issue.type == util.COV) {
        nlog.info_issue(to_console_cov(issue) + msg_postfix)
      } else if (issue.type == util.OK) {
        // TODO: don't log for now (too annoying for certain user experiences)
      } else {
        nlog.info_issue(to_console(issue) + msg_postfix)
      }
    }

    if (showsnippets) {
      to_console_snippet(issue, nocolors)
    }
  })
}

export = {
  issues: log_issue_messages,
  syntastic_issues: log_syntastic_applicable_messages,
}
