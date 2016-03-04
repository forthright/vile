mimus = require "mimus"
index = mimus.require "./../../lib/index", __dirname, []
chai = require "./../helpers/sinon_chai"
expect = chai.expect

describe "index", ->
