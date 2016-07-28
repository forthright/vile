mimus = require "mimus"
plugins = mimus.require "./../../lib/plugin", __dirname, []
chai = require "./../helpers/sinon_chai"
expect = chai.expect

describe "plugin", ->
