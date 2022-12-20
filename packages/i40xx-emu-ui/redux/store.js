let savedStore = null;

export function setStore(store) {
  savedStore = store;
}

export function getStore() {
  return savedStore;
}
