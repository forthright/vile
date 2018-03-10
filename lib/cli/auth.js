"use strict";
var logger = require("./../logger");
var log = logger.create("cli");
var create = function (cli) {
    return cli
        .command("auth")
        .action(function () {
        log.info("To authenticate, first go to " +
            "https://ferretci.com/auth_tokens and get an All token.");
        log.info();
        log.info("Then:");
        log.info();
        log.info("  ~$ FERRET_TOKEN=token FERRET_PROJECT=my-project ferret a -u");
    });
};
module.exports = { create: create };
