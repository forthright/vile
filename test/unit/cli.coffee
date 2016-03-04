mimus = require "mimus"
cli = mimus.require "./../../lib/cli", __dirname, []
chai = require "./../helpers/sinon_chai"
expect = chai.expect

describe "cli", ->
