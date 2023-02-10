import { Notification } from 'react-bulma-components';

import compilerStore from '../stores/compilerStore.js';

export default function CompilerInfo() {
  const compilerErrors = compilerStore.useState((state) => state.errors);
  return compilerErrors?.length
    ? (
      <Notification color="danger">
        {compilerErrors.map(({ text }, idx) => <div key={`compiler-error-${idx}`}>{text}</div>)}
      </Notification>
    )
    : null;
}
