import { Lexer }  from 'chevrotain';

import * as Tokens from './tokens.js';

export default new Lexer(Object.values(Tokens));
