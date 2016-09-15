/// <reference path="../lib/typings/index.d.ts" />

var _ = require("lodash")
var logger : Vile.Lib.Logger  = require("./../logger")
var util = require("./../util")

// TODO: DRY both methods
// TODO: move logging out of plugins?

var humanize_line_char = (issue : Vile.Issue) : string => {
  let start : Vile.IssueLine = _.get(issue, "where.start", {})
  let end : Vile.IssueLine = _.get(issue, "where.end", {})

  let start_character : string = (
      typeof start.character == "number" || typeof start.character == "string"
    ) ? String(start.character) : ""

  let end_character : string = (
      typeof end.character == "number" || typeof end.character == "string"
    ) && end.character != start.character ? `-${String(end.character)}` : ""

  return typeof end.character == "number" ?
    `${start_character}${end_character}` : start_character
}

var humanize_line_num = (issue) : string => {
  let start : Vile.IssueLine = _.get(issue, "where.start", {})
  let end : Vile.IssueLine = _.get(issue, "where.end", {})

  let start_line : string = (
      typeof start.line == "number" || typeof start.line == "string"
    ) ? String(start.line) : ""

  let end_line : string = (
      typeof end.line == "number" || typeof end.line == "string"
    ) && end.line != start.line ? `-${String(end.line)}` : ""

  return typeof end.line == "number" ?
    `${start_line}${end_line}` : start_line
}

var to_console = (
  issue : Vile.Issue,
  format : string = "default"
) : string => {
  if (format == "syntastic") {
    let t : string = issue.type
    let start_info : Vile.IssueLine
    let synastic_type : string = _
      .some(util.errors, (i) => i.type == t) ? "E" : "W"

    if (t == util.DUPE) {
      let locs = _.get(issue, "duplicate.locations", [])
      start_info = _.get(_.first(locs), "where.start", {})
    } else {
      start_info = _.get(issue, "where.start", {})
    }

    let h_line = _.get(start_info, "line", 1)
    let h_char = _.get(start_info, "character", 1)
    let details = _.has(issue, "title") &&
                  issue.message != issue.title ?
                    `${issue.title} => ${issue.message}` :
                      (issue.message || issue.title)

    return `${ issue.path }:${ h_line }:${ h_char }: ` +
      `${synastic_type}: ${ details }`
  } else {
    let h_line : string = humanize_line_num(issue)
    let h_char : string = humanize_line_char(issue)
    let details : string = _.has(issue, "title") &&
                  issue.message != issue.title ?
                    `${issue.title} => ${issue.message}` :
                      (issue.message || issue.title)
    let loc : string = h_line || h_char ?
      `${ h_line ? "line " + h_line + ", " : "" }` +
      `${ h_char ? "col " + h_char + ", " : "" }` : ""

    let msg : string = `${ issue.path }: ${ loc }${ details }`

    return msg
  }
}

var to_console_duplicate = (
  issue : Vile.Issue
) => {
  let files = _.chain(issue)
    .get("duplicate.locations", [])
    .map("path")
    .uniq()
    .join(", ")
  return `${ issue.path }: Similar code in ${ files }`
}

var to_console_churn = (
  issue : Vile.Issue
) => `${ issue.path }: ${ issue.churn }`

var to_console_comp = (
  issue : Vile.Issue
) => `${ issue.path }: ${ issue.complexity }`

var to_console_lang = (
  issue : Vile.Issue
) => `${ issue.path }: ${ issue.language }`

var to_console_git = (
  issue : Vile.Issue
) => {
  let date = _.get(issue, "commit.commit_date") ||
              _.get(issue, "commit.author_date")
  let sha = _.get(issue, "commit.sha")
  return `${ sha }: ${ date }`
}

var to_console_stat = (
  issue : Vile.Issue
) => {
  let size = _.get(issue, "stat.size", "?")
  let loc = _.get(issue, "stat.loc", "?")
  let lines = _.get(issue, "stat.lines", "?")
  let comments = _.get(issue, "stat.comments", "?")
  return `${ issue.path } (${ size ? (size / 1024).toFixed(3) + "KB" : "" })` +
    `: ${ lines } lines, ${ loc } loc, ${ comments } comments`
}

var to_console_dep = (
  issue : Vile.Issue
) : string => {
  let name = _.get(issue, "dependency.name", "?")
  let current = _.get(issue, "dependency.current", "?")
  let latest = _.get(issue, "dependency.latest", "?")
  return `New release for ${name}: ${current} < ${latest}`
}

var to_console_cov = (
  issue : Vile.Issue
) : string => {
  let cov = _.get(issue, "coverage.total", "?")
  return `${ issue.path }: ${ cov }% lines covered`
}

var log_syntastic_applicable_messages = (
  issues : Vile.Issue[] = []
) => {
  issues.forEach((issue : Vile.Issue, index : number) => {
    let issue_type : string = issue.type
    if (_.some(util.displayable_issues, (t) => issue_type == t)) {
      console.log(to_console(issue, "syntastic"))
    }
  })
}

var log_issue_messages = (
  issues : Vile.Issue[] = []
) => {
  let nlogs = {}

  issues.forEach((issue : Vile.Issue, index : number) => {
    let t = issue.type
    if (!nlogs[t]) nlogs[t] = logger.create(t)

    let plugin_name : string = _.get(issue, "plugin")
    let msg_postfix = plugin_name ? ` (vile-${ plugin_name })` : ""

    if (_.some(util.errors, (t) => issue.type == t)) {
      nlogs[t].error(to_console(issue) + msg_postfix)
    } else if (_.some(util.warnings, (t) => issue.type == t)) {
      if (issue.type == util.COMP) {
        nlogs[t].info(to_console_comp(issue) + msg_postfix)
      } else if (issue.type == util.CHURN) {
        nlogs[t].info(to_console_churn(issue) + msg_postfix)
      } else if (issue.type == util.DEP) {
        nlogs[t].warn(to_console_dep(issue) + msg_postfix)
      } else if (issue.type == util.DUPE) {
        nlogs[t].warn(to_console_duplicate(issue) + msg_postfix)
      } else {
        nlogs[t].warn(to_console(issue) + msg_postfix)
      }
    } else {
      if (issue.type == util.LANG) {
        nlogs[t].info(to_console_lang(issue) + msg_postfix)
      } else if (issue.type == util.GIT) {
        nlogs[t].info(to_console_git(issue) + msg_postfix)
      } else if (issue.type == util.STAT) {
        nlogs[t].info(to_console_stat(issue) + msg_postfix)
      } else if (issue.type == util.COV) {
        nlogs[t].info(to_console_cov(issue) + msg_postfix)
      } else if (issue.type == util.OK) {
        nlogs[t].info(issue.path + msg_postfix)
      } else {
        nlogs[t].info(to_console(issue) + msg_postfix)
      }
    }
  })
}

module.exports = {
  issues: log_issue_messages,
  syntastic_issues: log_syntastic_applicable_messages,
}
