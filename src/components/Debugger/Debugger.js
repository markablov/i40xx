import React, { Component } from 'react';
import Tabs from 'react-bulma-components/lib/components/tabs';

class Debugger extends Component {
  render(){
    return (
      <>
        <Tabs type={'toggle'} fullwidth={false}>
          <Tabs.Tab>General</Tabs.Tab>
          <Tabs.Tab>Memory</Tabs.Tab>
        </Tabs>
      </>
    );
  }
}

export default Debugger;
