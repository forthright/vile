/// <reference path="@types/index.d.ts" />

import http = require("http")
import Bluebird = require("bluebird")
import request = require("request")
import logger = require("./logger")
import _ = require("lodash")

const HOST = "vile.io"
const PROD_URL = `https://${HOST}`
const API_TARGET = "api/v0"
const VILE_APP = process.env.VILE_APP || PROD_URL
const log = logger.create(HOST)

const http_authentication = (auth_token : string) : any => {
  return { "Authorization": `Token token=${auth_token}` }
}

const api_path = (endpoint : string) : string =>
  `${VILE_APP}/${API_TARGET}/${endpoint}`

const handle_response = (
  resolve : (r : vile.API.HTTPResponse) => void,
  reject : (e : { error: NodeJS.ErrnoException }) => void
) : request.RequestCallback => (
  err : NodeJS.ErrnoException,
  response : http.IncomingMessage,
  body : vile.API.JSONResponse
) =>
  err ?
    reject({ error: err }) :
    resolve({ body: body, response: response })

const commit = (
  issues : any[],
  cli_time : number,
  auth : vile.Auth
) : Bluebird<any> =>
  new Bluebird((resolve, reject) => {
    let url = api_path(`projects/${auth.project}/commits`)
    log.debug(`POST ${url}`)
    request.post({
      url: url,
      headers: http_authentication(auth.token),
      form: {
        issues: JSON.stringify(issues),
        cli_time: cli_time
      }
    },
    handle_response(resolve, reject))
  })

const commit_status = (
  commit_id : number,
  auth : vile.Auth
) =>
  new Bluebird((resolve, reject) => {
    let url = api_path(
      `projects/${auth.project}/commits/${commit_id}/status`)
    log.debug(`GET ${url}`)
    request.get({
      url: url,
      headers: http_authentication(auth.token)
    },
    handle_response(resolve, reject))
  })

const padded_file_score = (score : number) =>
  (score < 100 ? " " : "") + String(score) + "%"

const log_summary = (post_json : any, verbose : boolean = false) => {
  let score : number = _.get(post_json, "score", 100)
  let files : any[] = _.get(post_json, "files", [])
  let time : number = _.get(post_json, "time", 0)
  let url : string = _.get(post_json, "url", "")
  let time_in_seconds : string = (time / 1000)
    .toFixed(2)
    .toString()
    .replace(/\.0*$/, "")

  if (verbose) {
    _.each(files, (file : any) => {
      log.info(
        `${padded_file_score(_.get(file, "score", 0))} => ` +
        `${_.get(file, "path")}`)
    })
  }

  log.info()
  log.info(`Score: ${score}%`)
  log.info(`Time: ${time_in_seconds}s`)
  log.info(url)
}

export = <vile.Lib.Service>{
  commit: commit,
  commit_status: commit_status,
  log: log_summary
}
