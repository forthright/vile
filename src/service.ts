/// <reference path="lib/typings/index.d.ts" />

module vile {

let Bluebird : typeof Promise = require("bluebird")
let request : any = require("request")
let _ : any = require("lodash")
let fs = require("fs")
let path : any = require("path")

const VILE_APP = process.env.VILE_APP || "http://joffrey-baratheon.herokuapp.com"

let commit = (issues, auth) =>
  new Bluebird((resolve, reject) => {
    request.post({
      url: `${VILE_APP}/commits`,
      form: {
        auth: {
          project: auth.project,
          email: auth.email,
          token: auth.token
        },
        issues: JSON.stringify(issues)
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
