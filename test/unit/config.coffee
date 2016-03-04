mimus = require "mimus"
config = mimus.require "./../../lib/config", __dirname, []
chai = require "./../helpers/sinon_chai"
expect = chai.expect

describe "config", ->
