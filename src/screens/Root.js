import React from 'react';
import { Box, Columns, Container, Section } from 'react-bulma-components';

import Editor from '../components/Editor/Editor.js';
import Debugger from '../components/Debugger/Debugger.js';
import Memory from '../components/Debugger/Memory/Memory.js';
import Footer from '../components/Footer.js';
import BusyOverlay from '../components/BusyOverlay.js';
import CompilerInfo from '../components/CompilerInfo.js';

import './Root.scss';

function Root() {
  return (
    <BusyOverlay>
      <Section>
        <Container breakpoint="fluid">
          <Columns>
            <Columns.Column>
              <Box>
                <CompilerInfo />
                <Editor />
              </Box>
            </Columns.Column>
            <Columns.Column>
              <Box>
                <Debugger />
              </Box>
            </Columns.Column>
            <Columns.Column>
              <Box>
                <Memory />
              </Box>
            </Columns.Column>
          </Columns>
        </Container>
      </Section>
      <Footer />
    </BusyOverlay>
  );
}

export default Root;
