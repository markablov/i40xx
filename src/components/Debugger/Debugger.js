import React, { Component } from 'react';
import { Tabs } from 'react-bulma-components';

import Memory from './Memory/Memory.js';
import General from './General.js';
import IO from './IO.js';

class Debugger extends Component {
  state = {
    activeTabId: 'general',
    tabs: {
      general: { component: General, label: 'General' },
      io: { component: IO, label: 'IO' },
      memory: { component: Memory, label: 'Memory' },
    },
  };

  handleTabClick = (id) => this.setState({ activeTabId: id });

  render() {
    const { activeTabId, tabs } = this.state;
    const activeTab = tabs[activeTabId];

    return (
      <>
        <Tabs fullwidth={false} type="toggle">
          {
            Object.entries(tabs).map(([id, { label }]) => (
              <Tabs.Tab key={`debugger-tab-${id}`} active={id === activeTabId} onClick={() => this.handleTabClick(id)}>{label}</Tabs.Tab>
            ))
          }
        </Tabs>
        { React.createElement(activeTab.component) }
      </>
    );
  }
}

export default Debugger;
