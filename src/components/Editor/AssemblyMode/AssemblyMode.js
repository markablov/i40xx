import 'brace/mode/text';

import HighlightRules from './HighlightRules.js';
import Tokenizer from './Tokenizer.js';

class AssemblyMode extends window.ace.acequire('ace/mode/text').Mode {
  constructor(offsetCalculator) {
    super();
    // uses by TextMode to implement toggleCommentLines() to comment or un-comment selected lines
    this.lineCommentStart = ['//', '#'];
    this.$highlightRules = new HighlightRules();
    this.$tokenizer = new Tokenizer(this.$highlightRules.getRules(), offsetCalculator);
    this.$id = 'assembly_i4004';
  }
}

export default AssemblyMode;
