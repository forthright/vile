readline = require "readline"
path = require "path"
child_process = require "child_process"
chai = require "chai"
expect = chai.expect

VILE_BIN = path.join(__dirname, "..", "..", "bin", "vile")

sys_test_count = 0

exec_err = (args, cb, stdio) ->
  exec args, cb, stdio, true

exec = (args, cb, stdio, pass_err) ->
  cmd = undefined
  sys_test_count += 1

  cmd = "#{VILE_BIN} #{args}"

  cli_args = cmd.split(" ")
  proc = child_process.spawn(
    "node",
    cli_args,
    stdio: stdio,
    env: process.env)

  out = ""
  err = ""
  error = undefined

  proc.stdout.on "data", (d) -> out += d
  proc.stderr.on "data", (d) -> err += d

  proc.on "error", (e) -> throw e

  proc.on "close", (code) ->
    if pass_err
      cb(
        new Buffer(out).toString("utf-8"),
        new Buffer(err).toString("utf-8"),
        code)
    else
      expect(err).to.be.falsy
      console.log(err) if err
      cb new Buffer(out).toString("utf-8")

  proc

exec_interactive = (args, cb, done) ->
  stdout = []

  proc = exec_err(
    args,
    done,
    [ "pipe", "pipe", "pipe" ])

  proc.stdin.setEncoding "utf-8"

  proc.stdout.on "data", (chunk) ->
    cb chunk.toString("utf-8")

  proc

module.exports =
  exec: exec
  exec_err: exec_err
  exec_interactive: exec_interactive
