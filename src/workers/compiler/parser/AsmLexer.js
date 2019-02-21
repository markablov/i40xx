import { Lexer }  from 'chevrotain';

import Tokens from './tokens.js';

export default new Lexer(Object.values(Tokens));
