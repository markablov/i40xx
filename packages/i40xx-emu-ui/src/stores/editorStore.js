import { Store } from 'pullstate';
import { enableMapSet } from 'immer';

enableMapSet();

export default new Store({
  breakpoints: new Set(),
  editor: null,
});
