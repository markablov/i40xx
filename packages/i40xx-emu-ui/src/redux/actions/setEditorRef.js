import { SET_EDITOR_REF } from '../constants.js';

export default (editor) => ({
  payload: editor,
  type: SET_EDITOR_REF,
});
