"use strict";

var opn = require("opn");
var VILE_DOCS_URL = "https://vile-docs.herokuapp.com";
var create = function create(cli) {
    return cli.command("docs").alias("d").action(function () {
        opn(VILE_DOCS_URL);
    });
};
module.exports = {
    create: create
};