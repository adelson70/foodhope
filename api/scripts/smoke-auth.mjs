import {
  createHash,
  generateKeyPairSync,
  sign,
} from 'node:crypto';

const BASE = process.env.API_URL || 'http://localhost:5000';

function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

function buildCanonical(method, pathWithQuery, timestamp, bodyHash) {
  return `${method.toUpperCase()}\n${pathWithQuery}\n${timestamp}\n${bodyHash}`;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });
  const publicKeyBase64 = publicKey
    .export({ type: 'spki', format: 'der' })
    .toString('base64');

  console.log('1) GET /produto sem auth → expect 401');
  {
    const res = await fetch(`${BASE}/produto?limit=1`);
    assert(res.status === 401, `esperado 401, veio ${res.status}`);
    console.log('   ok', res.status);
  }

  console.log('2) POST /visitor/register');
  const regRes = await fetch(`${BASE}/visitor/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: publicKeyBase64 }),
  });
  const regJson = await regRes.json();
  assert(regRes.ok && regJson.sucesso, `register falhou: ${JSON.stringify(regJson)}`);
  const { visitorId, challenge } = regJson.dados;
  console.log('   ok', visitorId);

  console.log('3) POST /visitor/confirm');
  const challengeSig = sign(
    'SHA256',
    Buffer.from(challenge, 'utf8'),
    { key: privateKey, dsaEncoding: 'ieee-p1363' },
  ).toString('base64');
  const confRes = await fetch(`${BASE}/visitor/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId, signature: challengeSig }),
  });
  const confJson = await confRes.json();
  assert(confRes.ok && confJson.sucesso && confJson.dados?.verified, `confirm falhou: ${JSON.stringify(confJson)}`);
  console.log('   ok verified');

  console.log('4) GET /produto com assinatura visitor');
  {
    const path = '/produto?limit=1';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const bodyHash = sha256Hex('');
    const canonical = buildCanonical('GET', path, timestamp, bodyHash);
    const signature = sign(
      'SHA256',
      Buffer.from(canonical, 'utf8'),
      { key: privateKey, dsaEncoding: 'ieee-p1363' },
    ).toString('base64');

    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'X-Visitor-ID': visitorId,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
    });
    const json = await res.json();
    assert(res.ok && json.sucesso, `listar visitor falhou: ${res.status} ${JSON.stringify(json)}`);
    console.log('   ok', res.status, 'itens=', json.dados?.data?.length ?? '?');
  }

  console.log('5) replay mesma assinatura → expect 401');
  {
    const path = '/produto?limit=1';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const bodyHash = sha256Hex('');
    const canonical = buildCanonical('GET', path, timestamp, bodyHash);
    const signature = sign(
      'SHA256',
      Buffer.from(canonical, 'utf8'),
      { key: privateKey, dsaEncoding: 'ieee-p1363' },
    ).toString('base64');
    const headers = {
      'X-Visitor-ID': visitorId,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    };
    const first = await fetch(`${BASE}${path}`, { headers });
    assert(first.ok, `primeira request deveria passar: ${first.status}`);
    const second = await fetch(`${BASE}${path}`, { headers });
    assert(second.status === 401, `replay esperado 401, veio ${second.status}`);
    console.log('   ok replay bloqueado');
  }

  console.log('6) POST /auth/login público');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'operador', senha: 'teste' }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok || !loginJson.sucesso) {
    console.log('   skip login (credenciais locais diferentes):', loginJson.mensagens ?? loginRes.status);
  } else {
    const token = loginJson.dados.access_token;
    console.log('   ok token');

    console.log('7) GET /produto com JWT');
    const prodRes = await fetch(`${BASE}/produto?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const prodJson = await prodRes.json();
    assert(prodRes.ok && prodJson.sucesso, `JWT listar falhou: ${JSON.stringify(prodJson)}`);
    console.log('   ok');

    console.log('8) GET /dash com JWT');
    const dashRes = await fetch(`${BASE}/dash`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(dashRes.ok, `dash falhou: ${dashRes.status}`);
    console.log('   ok');

    console.log('9) GET /dash só visitor → expect 401');
    const path = '/dash';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const canonical = buildCanonical('GET', path, timestamp, sha256Hex(''));
    const signature = sign(
      'SHA256',
      Buffer.from(canonical, 'utf8'),
      { key: privateKey, dsaEncoding: 'ieee-p1363' },
    ).toString('base64');
    const bad = await fetch(`${BASE}${path}`, {
      headers: {
        'X-Visitor-ID': visitorId,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
    });
    assert(bad.status === 401, `dash visitor deveria 401, veio ${bad.status}`);
    console.log('   ok');
  }

  console.log('\nSMOKE OK');
}

main().catch((err) => {
  console.error('\nSMOKE FAIL:', err.message);
  process.exit(1);
});
