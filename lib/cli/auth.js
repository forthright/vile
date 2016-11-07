/// <reference path="../@types/index.d.ts" />
"use strict";

var logger = require("./../logger");
var log = logger.create("cli");
// TODO: any is Commander.js
var create = function create(cli) {
    return cli.command("auth").alias("a").action(function () {
        log.info("To authenticate, first go to " + "https://vile.io and get a user token.");
        log.info();
        log.info("Then:");
        log.info();
        log.info("  ~$ VILE_API_TOKEN=token VILE_PROJECT=my-project vile p -u");
    });
};
module.exports = {
    create: create
};