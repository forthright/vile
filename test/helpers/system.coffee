readline = require "readline"
path = require "path"
child_process = require "child_process"
chai = require "chai"
expect = chai.expect

CWD = process.cwd()
VILE_BIN = path.join(__dirname, "..", "..", "bin", "vile")
NYC_BIN = path.resolve(path.join(
  __dirname, "..", "..", "node_modules", ".bin", "nyc"))

sys_test_count = 0

exec_err = (args, cb, stdio) ->
  exec args, cb, stdio, true

exec = (args, cb, stdio, pass_err) ->
  cmd = undefined
  sys_test_count += 1
  cov_dir = path.join CWD, "coverage", "system-#{sys_test_count}"

  if process.env.TEST_COV == "1"
    cmd = "#{NYC_BIN} -r json " +
    "-x .test -x **/node_modules/** " +
    "--report-dir #{cov_dir} #{VILE_BIN} #{args}"
  else
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

  proc = exec(
    args,
    (stdout) ->
      done(stdout)
    ,
    [ "pipe", "pipe", "pipe" ])

  proc.stdin.setEncoding "utf-8"

  proc.stdout.on "data", (chunk) ->
    cb chunk.toString("utf-8")

  proc

module.exports =
  exec: exec
  exec_err: exec_err
  exec_interactive: exec_interactive
