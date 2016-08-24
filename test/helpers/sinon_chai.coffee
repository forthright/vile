sinon = require "sinon"
chai = require "chai"
sinon_chai = require "sinon-chai"
chai_as_promised = require "chai-as-promised"

chai.use sinon_chai
    .use chai.should
    .use chai_as_promised
    .should()

module.exports = chai
