// Teste de carga da impressão (fila-impressao → API → ponte ESP32 → impressora).
//
// Enfileira cupons realistas DIRETO na fila BullMQ (sem criar pedidos no banco) e mede, por job,
// o tempo do enfileiramento até a confirmação (ACK do ESP32). IMPRIME DE VERDADE no destino
// configurado na API: use o emulador escpos (docker compose --profile dev up -d escpos).
//
// Uso (na pasta api/, depois de `npm run build`):
//   REDIS_HOST=localhost REDIS_PORT=6379 node scripts/carga-ponte.mjs <A|B|C|D|E|real> --confirmo
//
// Pico real medido em produção (05/09/2026): 6 pedidos/min, 16 em 5 min, 44/h, 77/dia;
// até 3 cupons por pedido.
import { Queue, QueueEvents } from 'bullmq';

import {
  linhaBanner,
  linhaCentralizada,
  linhaItemCupom,
  linhaAdicionalCupom,
  linhaMetaCupom,
  linhaNumeroPedido,
  linhaObsCupom,
  linhaSeparadora,
  linhaTotalCupom,
} from '../dist/src/modules/impressora/impressao-texto.js';

const CENARIOS = {
  A: { descricao: 'pico real: 18 cupons/min por 10 min', porMinuto: 18, minutos: 10 },
  B: { descricao: '10x: 180 cupons/min por 10 min', porMinuto: 180, minutos: 10 },
  C: { descricao: 'rajada: 200 cupons de uma vez', rajada: 200 },
  D: { descricao: 'noite cheia 10x: 1320 cupons em 1 h', porMinuto: 22, minutos: 60 },
  E: {
    descricao: 'caos: cenário B; derrube o ESP32/Wi-Fi 20 s a cada 2 min durante o teste',
    porMinuto: 180,
    minutos: 10,
  },
  real: { descricao: 'impressora real: 10 cupons', rajada: 10 },
};

const [nome, ...flags] = process.argv.slice(2);
const cenario = CENARIOS[nome];
if (!cenario || !flags.includes('--confirmo')) {
  console.error(`Uso: node scripts/carga-ponte.mjs <${Object.keys(CENARIOS).join('|')}> --confirmo`);
  console.error('Os cupons SÃO impressos no destino configurado na API (use o emulador).');
  process.exit(1);
}

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const PRODUTOS = ['X-Burguer', 'X-Salada', 'Batata frita', 'Refrigerante lata', 'Açaí 500ml', 'Pastel de carne', 'Suco natural'];

function cupom(n) {
  const itens = 2 + (n % 6); // 2–7 itens, como nos pedidos reais
  const linhas = [
    '',
    linhaBanner('Teste de carga'),
    linhaNumeroPedido(90000 + n),
    linhaMetaCupom(new Date().toLocaleTimeString('pt-BR')),
    linhaCentralizada('Cliente Carga'),
    linhaSeparadora(),
  ];
  for (let i = 0; i < itens; i++) {
    linhas.push(linhaItemCupom(1 + (i % 2), PRODUTOS[(n + i) % PRODUTOS.length], 12.5 + i));
    if (i % 2 === 0) linhas.push(linhaAdicionalCupom('Bacon extra', 4));
    if (i % 3 === 0) linhas.push(linhaObsCupom('sem cebola'));
  }
  linhas.push(linhaSeparadora(), linhaTotalCupom('Total', 30 + itens * 13));
  return linhas.join('\n');
}

const fila = new Queue('fila-impressao', { connection });
const eventos = new QueueEvents('fila-impressao', { connection });
await eventos.waitUntilReady();

const meus = new Map(); // jobId -> enfileiradoEm
const latencias = [];
let falhasDefinitivas = 0;
let tentativasExtras = 0;

eventos.on('completed', async ({ jobId }) => {
  const t0 = meus.get(jobId);
  if (t0 === undefined) return;
  meus.delete(jobId);
  latencias.push(Date.now() - t0);
});
eventos.on('failed', async ({ jobId }) => {
  if (!meus.has(jobId)) return;
  const job = await fila.getJob(jobId);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    meus.delete(jobId);
    falhasDefinitivas++;
  } else {
    tentativasExtras++;
  }
});

async function enfileirar(n) {
  const job = await fila.add('imprimir-pedido', { texto: cupom(n) });
  meus.set(job.id, Date.now());
}

console.log(`Cenário ${nome}: ${cenario.descricao} | Redis ${connection.host}:${connection.port}`);
const inicio = Date.now();
let total = 0;

if (cenario.rajada) {
  await Promise.all(Array.from({ length: cenario.rajada }, (_, i) => enfileirar(i)));
  total = cenario.rajada;
} else {
  total = cenario.porMinuto * cenario.minutos;
  const intervalo = 60_000 / cenario.porMinuto;
  for (let i = 0; i < total; i++) {
    const alvo = inicio + i * intervalo;
    const espera = alvo - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    await enfileirar(i);
    if (i % cenario.porMinuto === 0) {
      console.log(`  ${Math.round((Date.now() - inicio) / 1000)}s: ${i}/${total} enfileirados, ${latencias.length} confirmados, ${meus.size} pendentes`);
    }
  }
}

// espera drenar (até 10 min depois do último envio, por causa do backoff do cenário E)
const limite = Date.now() + 10 * 60_000;
while (meus.size > 0 && Date.now() < limite) await new Promise((r) => setTimeout(r, 500));

latencias.sort((a, b) => a - b);
const p = (q) => (latencias.length ? latencias[Math.floor(q * (latencias.length - 1))] : NaN);
const duracao = (Date.now() - inicio) / 1000;

console.log('\nResultado');
console.log(`  enfileirados:        ${total}`);
console.log(`  confirmados (ACK):   ${latencias.length}`);
console.log(`  falhas definitivas:  ${falhasDefinitivas}`);
console.log(`  sem resposta:        ${meus.size}`);
console.log(`  novas tentativas:    ${tentativasExtras}`);
console.log(`  latência enfileirar→ACK  p50 ${p(0.5)} ms | p95 ${p(0.95)} ms | p99 ${p(0.99)} ms | máx ${p(1)} ms`);
console.log(`  vazão: ${(latencias.length / duracao).toFixed(1)} cupons/s em ${duracao.toFixed(0)} s`);
console.log('  Duplicatas: confira no emulador (cada número #9xxxx deve aparecer uma vez).');

const ok = latencias.length === total && falhasDefinitivas === 0;
console.log(ok ? '\nAPROVADO: nenhum cupom perdido.' : '\nREPROVADO: houve cupom perdido.');
await eventos.close();
await fila.close();
process.exit(ok ? 0 : 1);
