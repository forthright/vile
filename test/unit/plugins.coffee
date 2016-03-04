mimus = require "mimus"
plugins = mimus.require "./../../lib/plugins", __dirname, []
chai = require "./../helpers/sinon_chai"
expect = chai.expect

describe "plugins", ->
