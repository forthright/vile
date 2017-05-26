import _ = require("lodash")
import logger = require("./../logger")
import util = require("./../util")

// TODO: DRY both methods
// TODO: move logging out of plugins?

const humanize_line_char = (issue : vile.Issue) : string => {
  const start : vile.IssueLine = _.get(issue, "where.start", {})
  const end : vile.IssueLine = _.get(issue, "where.end", {})

  const start_character : string = (
      typeof start.character == "number" || typeof start.character == "string"
    ) ? String(start.character) : ""

  const end_character : string = (
      typeof end.character == "number" || typeof end.character == "string"
    ) && end.character != start.character ? `-${String(end.character)}` : ""

  return typeof end.character == "number" ?
    `${start_character}${end_character}` : start_character
}

const humanize_line_num = (issue : vile.Issue) : string => {
  const start : vile.IssueLine = _.get(issue, "where.start", {})
  const end : vile.IssueLine = _.get(issue, "where.end", {})

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
  issue : vile.Issue,
  format : string = "default"
) : string => {
  if (format == "syntastic") {
    const issue_type : string = issue.type
    let start_info : vile.IssueLine
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

    const msg : string = `${ issue.path }: ${ loc }${ details }`

    return msg
  }
}

const to_console_duplicate = (
  issue : vile.Issue
) => {
  const files = _.chain(
    _.get(issue, "duplicate.locations", [])
  ).map("path").uniq().join(", ")
  return `${ issue.path }: Similar code in ${ files }`
}

const to_console_churn = (
  issue : vile.Issue
) => `${ issue.path }: ${ issue.churn }`

const to_console_comp = (
  issue : vile.Issue
) => `${ issue.path }: ${ issue.complexity }`

const to_console_lang = (
  issue : vile.Issue
) => `${ issue.path }: ${ issue.language }`

const to_console_scm = (
  issue : vile.Issue
) => {
  const date = _.get(issue, "commit.commit_date") ||
              _.get(issue, "commit.author_date")
  const sha = _.get(issue, "commit.sha")
  return `${ sha }: ${ date }`
}

const to_console_stat = (
  issue : vile.Issue
) => {
  const size = _.get(issue, "stat.size", "?")
  const loc = _.get(issue, "stat.loc", "?")
  const lines = _.get(issue, "stat.lines", "?")
  const comments = _.get(issue, "stat.comments", "?")
  return `${ issue.path } ` +
    `(${ size ? (Number(size) / 1024).toFixed(3) + "KB" : "" })` +
    `: ${ lines } lines, ${ loc } loc, ${ comments } comments`
}

const to_console_dep = (
  issue : vile.Issue
) : string => {
  const name = _.get(issue, "dependency.name", "?")
  const current = _.get(issue, "dependency.current", "?")
  const latest = _.get(issue, "dependency.latest", "?")
  return `New release for ${name}: ${current} < ${latest}`
}

const to_console_cov = (
  issue : vile.Issue
) : string => {
  const cov = _.get(issue, "coverage.total", "?")
  return `${ issue.path }: ${ cov }% lines covered`
}

const log_syntastic_applicable_messages = (
  issues : vile.Issue[] = []
) => {
  issues.forEach((issue : vile.Issue, index : number) => {
    const issue_type : string = issue.type
    if (_.some(util.displayable_issues, (t) => issue_type == t)) {
      console.log(to_console(issue, "syntastic"))
    }
  })
}

const log_issue_messages = (
  issues : vile.Issue[] = []
) => {
  const nlogs : { [issue_type : string] : Minilog } = {}

  issues.forEach((issue : vile.Issue, index : number) => {
    const logger_type : string = issue.type

    if (!nlogs[logger_type]) {
      nlogs[logger_type] = logger.create(logger_type)
    }

    const log = nlogs[logger_type]
    const plugin_name : string = _.get(issue, "plugin", "")
    const msg_postfix = plugin_name ? ` (vile-${ plugin_name })` : ""

    if (_.some(util.errors, (i_type) => issue.type == i_type)) {
      log.error(to_console(issue) + msg_postfix)
    } else if (_.some(util.warnings, (i_type) => issue.type == i_type)) {
      if (issue.type == util.COMP) {
        log.info(to_console_comp(issue) + msg_postfix)
      } else if (issue.type == util.CHURN) {
        log.info(to_console_churn(issue) + msg_postfix)
      } else if (issue.type == util.DEP) {
        log.warn(to_console_dep(issue) + msg_postfix)
      } else if (issue.type == util.DUPE) {
        log.warn(to_console_duplicate(issue) + msg_postfix)
      } else {
        log.warn(to_console(issue) + msg_postfix)
      }
    } else {
      if (issue.type == util.LANG) {
        log.info(to_console_lang(issue) + msg_postfix)
      } else if (issue.type == util.SCM) {
        log.info(to_console_scm(issue) + msg_postfix)
      } else if (issue.type == util.STAT) {
        log.info(to_console_stat(issue) + msg_postfix)
      } else if (issue.type == util.COV) {
        log.info(to_console_cov(issue) + msg_postfix)
      } else if (issue.type == util.OK) {
        log.info(issue.path + msg_postfix)
      } else {
        log.info(to_console(issue) + msg_postfix)
      }
    }
  })
}

export = {
  issues: log_issue_messages,
  syntastic_issues: log_syntastic_applicable_messages,
}
