import instructionLength from './InstructionLength.js';

class OffsetCalculator {
  #instructions = [{ len: 0, offset: 0 }];

  constructor(editor) {
    this.editor = editor;
  }

  offset(row) {
    return this.#instructions[row].offset;
  }

  row(offset) {
    return this.#instructions.findIndex((instruction) => instruction.offset === offset && instruction.len > 0);
  }

  all() {
    return this.#instructions;
  }

  update({ action, end: { row: endRow }, lines, start: { row: startRow } }) {
    const doc = this.editor.getSession().getDocument();
    let changed = false;

    // calculate length of updated instructions
    if (startRow === endRow) {
      const newInstrLen = instructionLength(doc.getLine(startRow));
      if (newInstrLen !== this.#instructions[startRow].len) {
        changed = true;
        this.#instructions[startRow].len = newInstrLen;
      }
    } else {
      changed = true;
      if (action === 'insert') {
        this.#instructions.splice(startRow + 1, 0, ...Array.from(Array(lines.length - 1), () => ({})));
        for (let i = startRow, end = startRow + lines.length; i < end; i++) {
          this.#instructions[i].len = instructionLength(doc.getLine(i));
        }
      } else if (action === 'remove') {
        this.#instructions.splice(startRow + 1, endRow - startRow);
        this.#instructions[startRow].len = instructionLength(doc.getLine(startRow));
      }
    }

    // if any instruction length has been updated or instructions has been added/removed
    // then we need to update offsets for following instructions
    if (changed) {
      for (let i = startRow + 1, end = this.#instructions.length; i < end; i++) {
        this.#instructions[i].offset = this.#instructions[i - 1].offset + this.#instructions[i - 1].len;
      }
    }

    return changed;
  }
}

export default OffsetCalculator;
