/// <reference path="../typings/index.d.ts" />

module vile {

let _ = require("lodash")
let Bluebird : typeof bluebird.Promise = require("bluebird")
let count_lines = require("count-lines")
let str = require("string-padder")
let fs = require("fs")
let logger : Vile.Lib.Logger = require("./logger")
let util = require("./util")

Bluebird.promisifyAll(fs)

let alpha_asc = (a : any, b : any) => a > b ? 1 : a == b ? 0 : -1

let weight = (type : string) : number => {
  switch(type) {
    case util.ERROR:
      return 1
    case util.WARNING:
      return 0.25
    case util.INFO:
    case util.OK:
      return 0
    default:
      return 1
  }
}

let letterize = (score : number) : string => {
  if (score > 90) return "A"
  if (score > 80) return "B"
  if (score > 70) return "C"
  if (score > 50) return "D"
  return "F"
}

// TODO: I hate this
let digest = (issues : Vile.IssuesPerFile) : Vile.Stats => {
  let total = []
  let lowest = 100
  let highest = 0
  let failed = 0
  let less_than_80 = 0
  let less_than_60 = 0
  let total_issues = 0

  _.keys(issues)
    .sort(alpha_asc)
    .forEach((file) => {
      let file_issues : Vile.IssueList = issues[file]
      let score = Math.round(
        _.sum(file_issues, (i) => i.score) /
        _.keys(file_issues).length
      )

      if (score > highest) highest = score
      if (score < lowest) lowest = score
      if (score < 100) {
        total_issues += _.reject(file_issues, (issue : Vile.Issue) => {
          return issue.score == 100
        }).length
        failed += 1
      }
      if (score < 80) less_than_80 += 1
      if (score < 60) less_than_60 += 1

      total.push(score)
    })

  let passed = total.length - failed

  // TODO: use a non-linear generator
  let project_score : number = Math.floor(
    // HACK: see above
    _.sum(total) / total.length *
      (failed < 5 ? 1 : passed / total.length)
  )

  return {
    total_issues:  total_issues,
    total_files:   total.length,
    failed_files:  failed,
    passed_files:  passed,
    project_score: project_score,
    letter_score:  letterize(project_score),
    lowest_score:  lowest,
    highest_score: highest,
    less_than_80:  less_than_80,
    less_than_60:  less_than_60
  }
}

let calculate_file = (file_issues : Vile.IssueList) : number => {
  let filepath : string = _.get(_.first(file_issues), "file")
  // TODO: use a cache or meoization or something to avoid reading all the time?
  let lines : number = fs.existsSync(filepath) ?
    count_lines(fs.readFileSync(filepath, "utf-8")) : 100 // TODO
  // TODO thoughts?
  let max : number = lines / file_issues.length
  let score : number = _.reduce(file_issues, (total, issue) => {
    return total - weight(issue.type)
  }, max)

  if (score < 0) score = 0

  let percent : number = (score / max) * 100
  if (percent < 0) percent = 0
  return Number(percent.toFixed(0)) // TODO: huh?
}

// TODO split up to make more readable
let calculate_all = (
  issues : Vile.IssueList[]
) : Vile.IssuesPerFile => {
  let all_issues = _.flatten(_.flatten(issues))

  let per_file_issues = _.reduce(all_issues,
    (file_issues : {[s : string]: any[]} | void, issue) => {
      if (!issue || !issue.file) return file_issues || []
      if (!file_issues[issue.file]) file_issues[issue.file] = []
      file_issues[issue.file].push(issue)
      return file_issues
    }, {})

  _.each(per_file_issues, (file_issues, filename) => {
    let file_score : number = calculate_file(file_issues)
    _.each(file_issues, (issue) => {
      issue.score = file_score
    })
  })

  return per_file_issues
}

// TODO: hate only_log_totals
let log_scores = (
  issues : Vile.IssuesPerFile,
  stats  : Vile.Stats,
  only_log_totals=false,
  show_grades=false
) => {
  if (!_.some(issues, (i : any) => i.length > 0)) return
  let log = logger.create("score")
  if (!only_log_totals) log.info()

  // TODO: DRY (in another method in this module)
  if (!only_log_totals) {
    _.keys(issues)
      .sort(alpha_asc)
      .forEach((file) => {
        let file_issues : Vile.IssueList = issues[file]
        let score = Math.round(
          _.sum(file_issues, (i) => i.score) /
          _.keys(file_issues).length
        )
        let display_score = show_grades ? letterize(score) : `${score}%`
        log.info(`${str.padRight(display_score, 8, " ")} ${file}`)
      })
  }

  let project_score = show_grades ?
    stats.letter_score : `${stats.project_score}%`

  let lowest_score = show_grades ?
    letterize(stats.lowest_score) : `${stats.lowest_score}%`

  let highest_score = show_grades ?
    letterize(stats.highest_score) : `${stats.highest_score}%`

  log.info()
  log.info(`Project Score:  ${project_score}`)
  log.info()
  log.info(`Total Issues:   ${stats.total_issues}`)
  log.info()
  log.info(`Failed Files:   ${stats.failed_files}`)
  log.info(`Passed Files:   ${stats.passed_files}`)
  log.info(`Total Files:    ${stats.total_files}`)
  log.info(`Lowest Score:   ${lowest_score}`)
  log.info(`Highest Score:  ${highest_score}`)
  log.info(`Below 80%:      ${stats.less_than_80}`)
  log.info(`Below 60%:      ${stats.less_than_60}`)
}

module.exports = {
  calculate_file: calculate_file,
  calculate_all: calculate_all,
  digest: digest,
  log: log_scores
}

}
