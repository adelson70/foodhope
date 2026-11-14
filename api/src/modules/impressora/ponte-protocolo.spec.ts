import {
  CABECALHO,
  FRAME,
  frame,
  framesDoJob,
  idDoFrame,
  ipParaU32,
  lerStatus,
  TAMANHO_PEDACO,
  u32ParaIp,
} from './ponte-protocolo.js';

describe('ponte-protocolo', () => {
  it('monta o cabeçalho tipo | id u32 BE | payload', () => {
    const f = frame(FRAME.JOB, 0x01020304, Uint8Array.from([9, 8]));
    expect([...f]).toEqual([0x01, 1, 2, 3, 4, 9, 8]);
  });

  it('job pequeno vai em um único frame JOB', () => {
    const frames = framesDoJob(7, Buffer.alloc(100, 1));
    expect(frames).toHaveLength(1);
    expect(frames[0][0]).toBe(FRAME.JOB);
    expect(frames[0].length).toBe(CABECALHO + 100);
  });

  it('job grande é fragmentado em PARTE… e termina em JOB, sem perder bytes', () => {
    const dados = Buffer.alloc(TAMANHO_PEDACO * 2 + 10);
    for (let i = 0; i < dados.length; i++) dados[i] = i & 255;
    const frames = framesDoJob(42, dados);
    expect(frames.map((f) => f[0])).toEqual([FRAME.PARTE, FRAME.PARTE, FRAME.JOB]);
    expect(frames.every((f) => f.readUInt32BE(1) === 42)).toBe(true);
    expect(Buffer.concat(frames.map((f) => f.subarray(CABECALHO))).equals(dados)).toBe(true);
    expect(Math.max(...frames.map((f) => f.length))).toBeLessThanOrEqual(15 * 1024);
  });

  it('converte IPv4 <-> u32', () => {
    expect(ipParaU32('10.0.0.50')).toBe(0x0a000032);
    expect(u32ParaIp(0x0a000032)).toBe('10.0.0.50');
    expect(ipParaU32('256.0.0.1')).toBeNull();
    expect(ipParaU32('abc')).toBeNull();
  });

  it('lê o STATUS do ESP32', () => {
    const p = Buffer.alloc(21);
    p.writeUInt32BE(0x0a000032, 0);
    p[4] = 1;
    p[5] = 0;
    p.writeInt8(-61, 6);
    p.writeUInt32BE(180000, 7);
    p.writeUInt32BE(3600, 11);
    Buffer.from([0x24, 0x6f, 0x28, 0xaa, 0xbb, 0x0c]).copy(p, 15);
    const status = lerStatus(Buffer.concat([p, Buffer.from('1.0.0')]));
    expect(status).toEqual({
      impressoraIp: '10.0.0.50',
      impressoraOnline: true,
      papel: 'ok',
      rssi: -61,
      heap: 180000,
      uptime: 3600,
      mac: '24:6F:28:AA:BB:0C',
      versao: '1.0.0',
    });
    expect(lerStatus(Buffer.alloc(10))).toBeNull();
  });

  it('id do frame: job numérico mantém o id; teste usa faixa alta', () => {
    expect(idDoFrame('316')).toBe(316);
    expect(idDoFrame(undefined)).toBeGreaterThanOrEqual(0x80000000);
  });
});
