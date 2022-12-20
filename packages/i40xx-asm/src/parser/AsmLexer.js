const { Lexer } = require('chevrotain');

const { allTokens } = require('./tokens.js');

module.exports = new Lexer(allTokens);
