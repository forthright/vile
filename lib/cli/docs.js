"use strict";
var opn = require("opn");
var VILE_DOCS_URL = "https://docs.vile.io";
var create = function (cli) {
    return cli
        .command("docs")
        .alias("d")
        .action(function () {
        opn(VILE_DOCS_URL);
    });
};
module.exports = { create: create };
