import React from 'react';
import Tabs from 'react-bulma-components/lib/components/tabs';

const Debugger = () => (
  <>
    <Tabs type={'toggle'} fullwidth={true}>
      <Tabs.Tab>General</Tabs.Tab>
      <Tabs.Tab>Disassembly</Tabs.Tab>
    </Tabs>
  </>
);

export default Debugger;
