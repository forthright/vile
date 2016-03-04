mimus = require "mimus"
service = mimus.require "./../../lib/service", __dirname, []
chai = require "./../helpers/sinon_chai"
expect = chai.expect

describe "service", ->
