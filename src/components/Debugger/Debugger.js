import React, { Component } from 'react';
import { Tabs } from 'react-bulma-components';

import Memory from './Memory/Memory.js';
import General from './General.js';
import IO from './IO.js';

class Debugger extends Component {
  state = {
    activeTab: 0,
    tabs: [
      { component: General, id: 'general', label: 'General' },
      { component: Memory, id: 'memory', label: 'Memory' },
      { component: IO, id: 'io', label: 'IO' },
    ],
  };

  handleTabClick = (id) => this.setState({ activeTab: id });

  render() {
    const { activeTab, tabs } = this.state;

    return (
      <>
        <Tabs fullwidth={false} type="toggle">
          {
            tabs.map(({ id, label }) =>
              <Tabs.Tab key={`debugger-tab-${id}`} active={id === activeTab} onClick={() => this.handleTabClick(id)}>{label}</Tabs.Tab>)
          }
        </Tabs>
        { React.createElement(tabs[activeTab].component) }
      </>
    );
  }
}

export default Debugger;
