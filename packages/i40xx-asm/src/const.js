const INSTRUCTION_TYPES = Object.freeze({
  Regular: Symbol('INSTRUCTION_TYPES/Regular'),
  JumpConditional: Symbol('INSTRUCTION_TYPES/JumpConditional'),
  FarJump: Symbol('INSTRUCTION_TYPES/FarJump'),
  Call: Symbol('INSTRUCTION_TYPES/Call'),
  Return: Symbol('INSTRUCTION_TYPES/Return'),
  Halt: Symbol('INSTRUCTION_TYPES/Halt'),
});

module.exports = {
  INSTRUCTION_TYPES,
};
