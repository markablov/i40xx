const { Lexer, createToken } = require('chevrotain');

const tokens = {};

const addToken = (name, options) => {
  tokens[name] = createToken({ name, ...options });
};

// we want to have labels started with z/c/t or with "add"/"sub"/... prefixes, but "Cond"/"InstructionXXX" tokens
// would be matched first, to prevent that we need to use "longer_alt" option to prefer longer tokens
const labelToken = createToken({ name: 'Label', pattern: /[a-z]\w*/ });

addToken('NewLine', { pattern: /\r?\n/ });
addToken('Colon', { pattern: ':' });
addToken('LBracket', { pattern: '(' });
addToken('RBracket', { pattern: ')' });
addToken('Comma', { pattern: ',' });
addToken('Comment', { pattern: /(?:#|(?:\/\/))[^\n\r]*/, group: Lexer.SKIPPED });
addToken('WhiteSpace', { pattern: /[^\S\r\n]+/, group: Lexer.SKIPPED });

addToken('KeywordLocationShort', { pattern: /__location/ });

const instructions = [
  'nop', 'rdm', 'rd0', 'rd1', 'rd2', 'rd3', 'rdr', 'wrm', 'wr0', 'wr1', 'wr2', 'wr3', 'wrr', 'wmp', 'adm', 'sbm', 'clb',
  'clc', 'cmc', 'stc', 'cma', 'iac', 'dac', 'ral', 'rar', 'tcc', 'daa', 'tcs', 'kbp', 'dcl', 'ldm', 'ld', 'xch', 'add',
  'sub', 'inc', 'bbl', 'jin', 'src', 'fin', 'jun', 'jms', 'jcn', 'isz', 'fim', 'wpm', 'hlt', 'bbs', 'lcr', 'or4', 'or5',
  'an6', 'an7', 'db0', 'db1', 'sb0', 'sb1', 'ein', 'din', 'rpm',
];
for (const instruction of instructions) {
  addToken(`Instruction${instruction.toUpperCase()}`, { pattern: new RegExp(instruction), longer_alt: labelToken });
}

addToken('Register', { pattern: /rr(?:(?:1[0-5])|(?:0?\d))/ });

addToken('RegisterPair', { pattern: /r[0-7]/ });

addToken('Cond', { pattern: /n?(?:(?:zct)|(?:zc)|(?:zt)|(?:ct)|z|c|t)/, longer_alt: labelToken });

// ROM address format is 00:0xFF, two parts - page number and address inside page
// page number: [0..9] OR [10..15]
// address inside page [100..199] OR [200..249] OR [250..255] OR [0x00..0xFF] OR [00..99]
addToken('ROMAddress', { pattern: /(?:(?:0?\d)|(?:1[0-5])):(?:(?:[01]\d\d)|(?:2[0-4]\d)|(?:25[0-5])|(?:0x[0-9a-f]{1,2})|(?:\d{1,2}))/ });

// Data is 12-bit maximum, so it could accept 0x000..0xFFF and 0..4095 ranges
// [1000..3999] OR [4000..4089] OR [4090..4095] OR [0x000..0xFFF] OR [000..999]
addToken('Data', { pattern: /(?:[0-3]\d\d\d)|(?:40[0-8]\d)|(?:409[0-5])|(?:0x[0-9a-f]{1,3})|(?:\d{1,3})/ });

// important to define label name after keywords, because lexer tries to match first rule from array
// and it could match label first because patterns of instruction names and labels are intersected
tokens.Label = labelToken;

module.exports = {
  allTokens: Object.values(tokens),
  Tokens: tokens,
};
