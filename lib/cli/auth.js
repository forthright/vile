"use strict";
var logger = require("./../logger");
var log = logger.create("cli");
var create = function (cli) {
    return cli
        .command("auth")
        .action(function () {
        log.info("To authenticate, first go to " +
            "https://vile.io/auth_tokens and get an All token.");
        log.info();
        log.info("Then:");
        log.info();
        log.info("  ~$ VILE_TOKEN=token VILE_PROJECT=my-project vile a -u");
    });
};
module.exports = { create: create };
