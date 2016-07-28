"use strict";

/// <reference path="../lib/typings/index.d.ts" />
var logger = require("./../logger");
var log = logger.create("cli");
// TODO: any is Commander.js
var create = function create(cli) {
    return cli.command("auth").alias("a").action(function () {
        log.info("To authenticate, first go to " + "https://vile.io and create a project AuthToken.");
        log.info();
        log.info("Then:");
        log.info();
        log.info("  ~$ export VILE_API_TOKEN=project_auth_token");
    });
};
module.exports = {
    create: create
};