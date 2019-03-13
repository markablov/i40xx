const commands = {
  configure: () => {
  }
};

onmessage = ({ data: { command, ...args } }) => {
  try {
    if (!commands[command])
      return postMessage({ command, error: 'Unknown command' });

    commands[command](...args);

    postMessage({ command });
  } catch (err) {
    postMessage({ command, error: err.toString() });
  }
};
