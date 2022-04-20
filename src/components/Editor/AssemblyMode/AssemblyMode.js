import 'ace-builds/src-noconflict/mode-text';

import HighlightRules from './HighlightRules.js';

class AssemblyMode extends window.ace.acequire('ace/mode/text').Mode {
  constructor() {
    super();
    // uses by TextMode to implement toggleCommentLines() to comment or un-comment selected lines
    this.lineCommentStart = ['//', '#'];
    this.HighlightRules = HighlightRules;
    this.$id = 'assembly_i40xx';
  }
}

export default AssemblyMode;
