import * as Actions from '../constants.js';

const defaultState = {
  breakpoints: {},
  compilerErrors: [],
  compiling: false,
  dump: null,
  editor: null,
  emulator: {
    IOLog: [],
    mode: 'run',
    ram: [],
    registers: {},
    running: false,
  },
  initialRAM: null,
};

export default (stateArg, { payload, type }) => {
  const state = stateArg || defaultState;

  switch (type) {
    case Actions.SET_EDITOR_REF:
      return { ...state, editor: payload };
    case Actions.START_COMPILATION:
      return { ...state, compiling: true };
    case Actions.FINISH_COMPILATION:
      return { ...state, compilerErrors: payload.errors, compiling: false, dump: payload.dump };
    case Actions.UPDATE_EMULATOR_STATE:
      return { ...state, emulator: { ...state.emulator, ...payload } };
    case Actions.SET_BREAKPOINTS:
      return { ...state, breakpoints: payload };
    case Actions.ADD_EMULATOR_IO_LOG_ENTRY:
      return { ...state, emulator: { ...state.emulator, IOLog: [...state.emulator.IOLog, payload] } };
    case Actions.CLEAR_IO_STATE:
      return { ...state, emulator: { ...state.emulator, IOLog: [] } };
    case Actions.SET_INITIAL_RAM_DUMP:
      return { ...state, initialRAM: payload };
    default:
      return state;
  }
};
