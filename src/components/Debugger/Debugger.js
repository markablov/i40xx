import React, { Component } from 'react';
import Tabs from 'react-bulma-components/lib/components/tabs';

import Memory from './Memory/Memory.js';
import General from './General.js';

class Debugger extends Component {
  state = {
    activeTab: 0,
    tabs: [
      { label: 'General', component: General },
      { label: 'Memory', component: Memory }
    ]
  };

  handleTabClick = idx => this.setState({ activeTab: idx });

  render(){
    const { tabs, activeTab } = this.state;

    return (
      <>
        <Tabs type={'toggle'} fullwidth={false}>
          {
            tabs.map(({ label }, idx) =>
              <Tabs.Tab active={idx === activeTab} onClick={() => this.handleTabClick(idx)} key={`debugger-tab-${idx}`}>{label}</Tabs.Tab>
            )
          }
        </Tabs>
        { React.createElement(tabs[activeTab].component) }
      </>
    );
  }
}

export default Debugger;
