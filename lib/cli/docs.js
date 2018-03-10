"use strict";
var opn = require("opn");
var FERRET_DOCS_URL = "https://docs.ferretci.com";
var create = function (cli) {
    return cli
        .command("docs")
        .action(function () {
        opn(FERRET_DOCS_URL);
    });
};
module.exports = { create: create };
