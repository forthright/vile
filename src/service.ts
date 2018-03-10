import http = require("http")
import Bluebird = require("bluebird")
import request = require("request")
import logger = require("./logger")
import _ = require("lodash")

const HOST = "ferretci.com"
const PROD_URL = `https://${HOST}`
const API_TARGET = "api/v0"
const FERRET_APP = process.env.FERRET_APP || PROD_URL
const log = logger.create(HOST)

const http_authentication = (auth_token : string) : any => {
  return { Authorization: `Token token=${auth_token}` }
}

const api_path = (endpoint : string) : string =>
  `${FERRET_APP}/${API_TARGET}/${endpoint}`

const handle_response = (
  resolve : (r : ferret.Service.HTTPResponse) => void,
  reject : (e : { error: NodeJS.ErrnoException }) => void
) : request.RequestCallback => (
  err : NodeJS.ErrnoException,
  response : http.IncomingMessage,
  body : ferret.Service.JSONResponse
) =>
  err ?
    reject({ error: err }) :
    resolve({ body, response })

// TODO: Flush out use of Bluebird<any>

const commit = (
  data : ferret.DataList,
  cli_time : number,
  auth : ferret.Auth
) : Bluebird<any> =>
  new Bluebird((resolve, reject) => {
    const url = api_path(`projects/${auth.project}/commits`)
    request.post({
      form: {
        cli_time,
        issues: JSON.stringify(data)
      },
      headers: http_authentication(auth.token),
      url
    },
    handle_response(resolve, reject))
  })

const commit_status = (
  commit_id : number,
  auth : ferret.Auth
) : Bluebird<any> =>
  new Bluebird((resolve, reject) => {
    const url = api_path(
      `projects/${auth.project}/commits/${commit_id}/status`)
    request.get({
      headers: http_authentication(auth.token),
      url
    },
    handle_response(resolve, reject))
  })

const padded_file_score = (score : number) =>
  (score < 100 ? " " : "") + String(score) + "%"

const log_summary = (
  post_json : ferret.Service.CommitStatus
) => {
  const score : number = _.get(post_json, "score", 100)
  const files : ferret.Service.CommitStatusFile[] = _.get(
    post_json, "files", [])
  const time : number = _.get(post_json, "time", 0)
  const url : string = _.get(post_json, "url", "")
  const time_in_seconds : string = (time / 1000)
    .toFixed(2)
    .toString()
    .replace(/\.0*$/, "")

  _.each(files, (file : ferret.Service.CommitStatusFile) => {
    log.info(
      `${padded_file_score(_.get(file, "score", 0))} => ` +
      `${_.get(file, "path")}`)
  })

  log.info()
  log.info(`Score: ${score}%`)
  log.info(`Time: ${time_in_seconds}s`)
  log.info(url)
}

const API = {
  COMMIT: {
    FAILED: "failed",
    FINISHED: "finished",
    PROCESSING: "processing"
  }
}

export = {
  API,
  commit,
  commit_status,
  log: log_summary
}
