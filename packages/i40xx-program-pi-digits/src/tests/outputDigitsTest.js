/* eslint-disable no-console */

import Emulator from 'i40xx-emu';
import path from 'node:path';
import fs from 'node:fs';

import { hexToHWNumber, numToHWNumber } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { updateCodeForUseInEmulator, generateMemoryBankSwitch } from '#utilities/codeGenerator.js';

import {
  writeValueToStatusChars, VARIABLES, getMemoryBankFromAbsoluteAddr, writeValueToMainChars,
} from '#utilities/memory.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const PROLOGUE_CYCLES_COUNT = 5n;
const CYCLES_PER_SECOND = 95000n;

const initMemoryWithInput = (memory, chunks) => {
  writeValueToStatusChars(numToHWNumber(0x100 - chunks.length), memory, VARIABLES.STATUS_MEM_VARIABLE_CHUNKS_COUNT_NEG);
  for (const [idx, chunk] of chunks.entries()) {
    writeValueToMainChars(hexToHWNumber(chunk), memory, idx % 16, getMemoryBankFromAbsoluteAddr(idx));
  }
};

const runSingleTest = (romDump, chunks) => {
  let result = '';
  const system = new Emulator({
    romDump,
    ramDump: RAM_DUMP,
    ramOutputHandler: ({ data }) => {
      result += String(data);
    },
  });

  const { memory, registers } = system;

  initMemoryWithInput(memory, chunks);

  registers.ramControl = 0b1110;
  while (!system.isFinished()) {
    system.instruction();
  }

  return { result, elapsed: system.instructionCycles };
};

const TESTS = [
  {
    input: ['0x131090FDAA2214C7', '0x13225BF2C23A63B1', '0x1159D9BF2FE39404', '0x12211E36010B0D24', '0x1324C9E6C6685876', '0x12F9801BBD867FE3', '0x134FE657E00D7D69', '0x12B13B343958ADEF', '0x12C92513F8C3B4E8', '0x1216831B8FAE5DFB', '0x12FD5E53EFC98A3E', '0x128BEDB83A5D9B80', '0x125E0D99E082A6F3', '0x11C2969FC4D02831', '0x11BE702E071FC3EC', '0x12D8ED4969A13D81', '0x1155A1EC6EBBDB09', '0x11247844E324805C', '0x1388692AB26CBAA6', '0x1246159CB221BE2D', '0x12CA941809D00B13', '0x1127D1D94521F823', '0x11DBDB9339E9D5F9', '0x11C7E714F86FE216', '0x1285C8D5E732E308', '0x119A97CA990993AD', '0x127321F613ACB19F', '0x11D8CEC1456549EE', '0x139E9821ED761C7D', '0x1211D765A04AA280', '0x11A1D13B013F1AB7', '0x1100DA83DA916D15', '0x141D0A7EC03A52FA', '0x1219184B42153610', '0x120406C3CE559613', '0x11625A4A8421D65C', '0x133E156C4E0C9A6A', '0x11375127FC0FF5B9', '0x125ADC887A134866', '0x11E392033513E32E', '0x125C0B9A3B089B72', '0x11AA31FDFE0C5525', '0x129A15E5B9CF3D34', '0x12CBCEC9C170432D', '0x142E700F38284D96', '0x118114DAC2FD9D99', '0x122E5E28F38ED09A', '0x1198BE958E1276CD', '0x1197BAFE95FCFE9F', '0x13506BA43258B974', '0x12C44C3FDDBAE1E6', '0x12DFD9DB05C80D18', '0x12A16854BD1F8537', '0x11EAE649E2D499A5', '0x1243C0B30C27EE2C', '0x11A3CBE8B0ED2215', '0x12C6B185EC73E4B8', '0x1326A0670B8E6B38', '0x127415E88E8C430D', '0x114594B5CB2335D3', '0x1434C3476EA71B9C', '0x11FB719B39DC6135', '0x13FB15083B883949', '0x1248B48632D2A191', '0x120F027120D16BC3', '0x125B461C6383B4F8', '0x12019EDAEC540187', '0x120A45C31F538037', '0x13450DE2E3BF6134', '0x11FB24A13E2D1BAC', '0x11D707F9FFD29741', '0x11B8B1CDF1CFE834', '0x12A6E2C89F7B0F87', '0x10739ADAB6D54795', '0x11A5B878564BD1A3', '0x1212576B823CB488', '0x137B2B4B5DEA9A16', '0x1215092340C48DCC', '0x1318146F6003CA7C', '0x1218841E55398019', '0x131B74C5704273CC', '0x11A0A3A62F25580C', '0x1283195DA678A199', '0x1247D792374AAB62', '0x10A0D86C226800EA', '0x1353FE557C67BB59', '0x122033265EDFC969', '0x1246ED4B5E0A2AF1', '0x130862A1577E8010', '0x109C190BE6432A3E', '0x12C1633BEE1A3C31', '0x129A91F15E339668', '0x12F9036CCA035C5B', '0x126C241BB424FB2A', '0x1390C0AFE6B81173', '0x1170033690CB49CB', '0x137B02F4B39C33B5', '0x12AE220160C09C8F', '0x1269AEB644F8E47D', '0x12AEAD34F364A32B', '0x11EA649C90206E38', '0x11D5B70BAC70B81E', '0x131AECB517AAA008', '0x117F749D93646E1A', '0x139B267EF9FCC38A', '0x11D3D4C4C46F78A4', '0x136B1F43D35392CC', '0x117CE83FFE256EB1', '0x13DC01F9619BF9F3', '0x11BA71DD5726208D', '0x1374DD9D41B28666', '0x139BC09C0B08D6AE', '0x12ECCDE41C588ABB', '0x111773FF60021696'],
    expected: '141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342117067982148086513282306647093844609550582231725359408128481117450284102701938521105559644622948954930381964428810975665933446128475648233786783165271201909145648566923460348610454326648213393607260249141273724587006606315588174881520920962829254091715364367892590360011330530548820466521384146951941511609433057270365759591953092186117381932611793105118548074462379962749567351885752724891227938183011949129833673362440656643086021394946395224737190702179860943702770539217176293176752384674818467669405132000568127145263560827785771342757789609173637178721468440901224953430146549585371050792279689258923542019956112129021960864034418159813629774771309960518707211349999998372978049951059731732816096318595024459455346908302642522308253344685035261931188171010003137838752886587533208381420617177669147303598253490428755468731159562863882353787593751957781857780532171226806613001927876611195909216420198938095257201065485863278865',
  },
  {
    input: ['0x15AFBE9EFDFBF381', '0x14C34FD6E75D154B', '0x15B93532EA1250DF', '0x16753518F1D8230A', '0x15BFFBAC149D1F9C', '0x152665CCC14EBAF6', '0x15D4FFB710A7C0FE', '0x159922485A7BD1B8', '0x17BA0FF2DAF9F8F6', '0x14D4F845E6A00FE5', '0x156EC8A75591DCDC', '0x160A21E962F841B5', '0x158AE9530DDF1A04', '0x14984CE697167669', '0x14B304BFAF00FD94', '0x1697C1DCE823F008', '0x15343DD9BDA47EA0', '0x15F2CE82E10A5D8C', '0x159C0A15CF642520', '0x14F80D2ABE0A41EA', '0x16166A0C9AC5CC59', '0x158AA3F27D38A7D4', '0x1558BA4F4110148D', '0x159A6281FA091902', '0x158F1243FAF815B4', '0x1671CB0375518AB0', '0x15D71951FE9E915F', '0x15C86A8B6FDA208A', '0x162A95B78FEBABF3', '0x1612BCAE68D5D04A', '0x149DF715982BEEDA', '0x15DEB547165B656E', '0x15FC9BC15920657F', '0x1584A5F242E4A318', '0x16DC18A2AB9C3B4E', '0x15E499CC53EB9B44', '0x17C90376AF0985E8', '0x15A82471161C01C8', '0x1560FD6FB72A29B9', '0x15290E3F861B4A84', '0x1549172592E042CA', '0x15A7B0F1A3C44263', '0x15556B4BE08F8390', '0x16740990E053BCAB', '0x143E909BF4B68E03', '0x16125862F7A0EAD8', '0x14E5250D26518AEB', '0x1686390B30B2E114', '0x156B5AA12F3315B0', '0x150E5AB688092FA3', '0x166FFB9667052A2E', '0x14C8D7DB4D62201B', '0x16413639EB723495', '0x14FCA95032425C7A', '0x1700CF9F42292060', '0x1668F227FCD1CECE', '0x16F1FF1948450B0C', '0x168356D538E95ADB', '0x14A643F6726157D2', '0x15C9B4C7907E142E', '0x162F7340C8ACD299', '0x1535AB98B1EECE68', '0x161F905C7A2E6FD9', '0x159F2CD9EDB8EECA', '0x16669696E69F8F58', '0x149494BC34489AD8', '0x15E0B15FDA82318B', '0x159B16E2F49A345E', '0x15B1C494B81A6E41', '0x15AA3151363C64E7', '0x15D4A121070568CA', '0x16A088ADDD6832E9', '0x16AF65DB0DE9C148', '0x162A17E238EDE0EC', '0x1625939A4F6F437E', '0x174230E8A1899902', '0x164B73382D2A6D99', '0x16CE47273923076C', '0x15406599B949A6D2', '0x1578BCB1F1838ED3', '0x15FD045BEAE551FB', '0x16BEAFE9D8F04C8C', '0x14EE6817D8ADCC18', '0x14BB384EF04E745B', '0x15BCEE60F8500D27', '0x154457D7DC8C2EAA', '0x15EB4FD6D657EA90', '0x1626B9CF1A95468F', '0x168FD0C6E94A6850', '0x1605719D0E195DD4', '0x167041C43B315673', '0x1730D20A4B3AD4DC', '0x16E7F088995D2617', '0x14B0839285CA8B85', '0x14B7C84C7A78C962', '0x160BDC73AD46D775', '0x15FCD7B790E6E238', '0x15C53A1B2C13A78D', '0x14C67CF7D7BC76C4', '0x15F7C7BA6EE61B1C', '0x1606DAEAF8167692', '0x1503D3512E91C3DA', '0x150FAB4D67EC4EA9', '0x151F0F0265233777', '0x15C3D98306E9ED4E', '0x152F769CD5496E95', '0x15D3FBB681641369', '0x1601E98010883D4B', '0x162065DA5A6F2692', '0x14DC50D89A015D94', '0x15A9DFA3D1579535', '0x16D26201C1AF3E72', '0x164B4A5D08C46DEB', '0x1551F5274C92AAB6'],
    expected: '936153381827968230301952035301852968995773622599413891249721775283479131515574857242454150695950829533116861727855889075098381754637464939319255060400927701671139009848824012858361603563707660104710181942955596198946767837449448255379774726847104047534646208046684259069491293313677028989152104752162056966024058038150193511253382430035587640247496473263914199272604269922796782354781636009341721641219924586315030286182974555706749838505494588586926995690927210797509302955321165344987202755960236480665499119881834797753566369807426542527862551818417574672890977772793800081647060016145249192173217214772350141441973568548161361157352552133475741849468438523323907394143334547762416862518983569485562099219222184272550254256887671790494601653466804988627232791786085784383827967976681454100953883786360950680064225125205117392984896084128488626945604241965285022210661186306744278622039194945047123713786960956364371917287467764657573962413890865832645995813390478027590099465764078951269468398352595709825822620522489407726',
  },
];

(function main() {
  const { roms, sourceCode } = compileCodeForTest('submodules/outputDigits.i4040', 'outputDigits');

  let sum = 0n;
  for (const [idx, { input, expected }] of TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${TESTS.length}...`);
    const { result, elapsed } = runSingleTest(roms.map(({ data }) => data), input);
    if (expected !== result) {
      const wrongDigitIdx = expected.split('').findIndex((digit, digitIdx) => result[digitIdx] !== digit);
      console.log(`Test failed, wrong digits from chunk #${Math.floor(wrongDigitIdx / 9)}, result = ${result}`);
      console.log('Code to reproduce:');
      console.log(updateCodeForUseInEmulator(sourceCode, [generateMemoryBankSwitch(0x7)]));
      console.log();

      const dumpPath = path.resolve('./ram.dump');
      initMemoryWithInput(RAM_DUMP, input);
      fs.writeFileSync(dumpPath, JSON.stringify(RAM_DUMP, undefined, 2));
      console.log(`RAM dump saved at path: ${dumpPath}`);

      process.exit(1);
    }

    sum += (elapsed - PROLOGUE_CYCLES_COUNT);
  }

  console.log(`Total time = ${sum / CYCLES_PER_SECOND}s`);
}());