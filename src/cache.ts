/// <reference path="lib/typings/index.d.ts" />

module vile {

let _ = require("lodash")
let cache = {}

let set = (key : string, item : any) => cache[key] = item

let get = (key : string) : any => cache[key]

let remove = (key : string) => delete cache[key]

let clear = () => _.keys(cache).each(remove)

module.exports = {
  get: get,
  set: set,
  remove: remove,
  clear: clear
}

}
