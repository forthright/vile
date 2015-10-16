/// <reference path="lib/typings/index.d.ts" />

module vile {

let Bluebird : typeof bluebird.Promise = require("bluebird")
let request : any = require("request")
let fs : any = require("fs")
let path : any = require("path")

const VILE_IO = "http://localhost:3000/commits"

let commit = (issues, stats, auth) =>
  new Bluebird((resolve, reject) => {
    request.post({
      url: VILE_IO,
      form: {
       project: auth.project,
       token: auth.token,
       email: auth.email,
       stats: stats,
       issues: issues
      }
    }, (err, httpResponse, body) => {
      if (err) reject({error: err})
      else resolve(<any>{
        body: body,
        response: httpResponse
      })
    })
  })

module.exports = {
  commit: commit
}

}
