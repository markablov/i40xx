/*
 * Returns all permutations of an array
 */
export function getPermutations(arr) {
  const res = [];
  const queue = [{ prefix: [], suffix: arr }];

  while (queue.length) {
    const { prefix, suffix } = queue.shift();
    if (!suffix.length) {
      res.push(prefix);
      continue;
    }

    for (const [elementIdx, nextElementForPrefix] of suffix.entries()) {
      queue.push({ prefix: [...prefix, nextElementForPrefix], suffix: suffix.filter((_, idx) => elementIdx !== idx) });
    }
  }

  return res;
}
