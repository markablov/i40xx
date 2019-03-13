const commands = {
  configure: () => {
  }
};

onmessage = ({ data: { command, ...args } }) => {
  try {
    if (!commands[command])
      return postMessage({ error: 'Unknown command' });

    commands[command](...args);

    postMessage({});
  } catch (err) {
    postMessage({ error: err.toString() });
  }
};
