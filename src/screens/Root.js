import React from 'react';
import { Box, Columns, Container, Section } from 'react-bulma-components';

import 'bulma/css/bulma.min.css';

import Editor from '../components/Editor/Editor.js';
import Debugger from '../components/Debugger/Debugger.js';
import Footer from '../components/Footer.js';
import BusyOverlay from '../components/BusyOverlay.js';

import './Root.css';

function Root() {
  return (
    <BusyOverlay>
      <Section>
        <Container>
          <Columns>
            <Columns.Column>
              <Box>
                <Editor />
              </Box>
            </Columns.Column>
            <Columns.Column>
              <Box>
                <Debugger />
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
