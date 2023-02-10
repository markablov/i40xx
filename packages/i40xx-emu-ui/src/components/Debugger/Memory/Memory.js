import { useState } from 'react';
import { Form } from 'react-bulma-components';

import emulatorStore from '../../../stores/emulatorStore.js';
import Register from './Register.js';
import FramedBox from '../../UI/FramedBox/FramedBox.js';

import './Memory.css';

export default function Memory() {
  const [uploadedRAMDumpName, setUploadedRAMDumpName] = useState('');
  const { ram, selectedRamBank } = emulatorStore.useState((state) => ({
    ram: state.ram,
    selectedRamBank: state.selectedRamBank,
  }));

  const uploadRAMDump = async (file) => {
    const dump = await file.text();

    emulatorStore.update((state) => {
      state.initialRam = JSON.parse(dump);
    });

    setUploadedRAMDumpName(file.name);
  };

  return (
    <>
      <div className="mb-2">
        <Form.InputFile label="Initial RAM dump..." onChange={(e) => uploadRAMDump(e.target.files[0])} />
        <span>
          Loaded dump:
          {uploadedRAMDumpName || 'none'}
        </span>
      </div>
      {
        ram.map(({ registers, selectedCharacter, selectedRegister }, bankIdx) => (
          <FramedBox key={`ram-bank-${bankIdx}`} narrow active={selectedRamBank === bankIdx} title={`Bank #${bankIdx}`}>
            <div className="memoryBank">
              {
                registers.map((reg, regIdx) => (
                  <div key={`ram-bank-${bankIdx}-reg-${regIdx}`}>
                    {
                      (regIdx && regIdx % 4 === 0)
                        ? <div className="registerSeparator" />
                        : null
                    }
                    <Register
                      data={reg}
                      selectedCharacter={selectedRegister === regIdx ? selectedCharacter : undefined}
                    />
                  </div>
                ))
              }
            </div>
          </FramedBox>
        ))
      }
    </>
  );
}
