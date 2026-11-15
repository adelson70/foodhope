// Aviso de "pedido pronto" por Firebase Cloud Messaging.
// Android: funciona no navegador e no app instalado. iOS (16.4+): só com o app
// adicionado à tela de início; no Safari comum não existe Web Push.
import { pedidoService } from '../services/pedido.service';
import { loadPedidosLocais } from './clienteStorage';
import { isDispositivoEquipe } from './dispositivoEquipe';
import { isIos, isStandalone } from './pwaInstall';

export type EstadoPush =
  | 'indisponivel' // sem suporte, sem Firebase configurado ou aparelho da equipe
  | 'ios-instalar' // iPhone fora do app instalado
  | 'pendente' // pode pedir permissão
  | 'ativo'
  | 'bloqueado';

const env = import.meta.env;
const configurado = Boolean(
  env.VITE_FIREBASE_API_KEY &&
    env.VITE_FIREBASE_PROJECT_ID &&
    env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
    env.VITE_FIREBASE_APP_ID &&
    env.VITE_FIREBASE_VAPID_KEY,
);

function suportaWebPush(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function estadoPush(): EstadoPush {
  if (!configurado || isDispositivoEquipe()) return 'indisponivel';
  if (!suportaWebPush()) {
    return isIos() && !isStandalone() ? 'ios-instalar' : 'indisponivel';
  }
  if (Notification.permission === 'granted') return 'ativo';
  if (Notification.permission === 'denied') return 'bloqueado';
  return 'pendente';
}

async function obterTokenFcm(): Promise<string | null> {
  const [{ initializeApp, getApps }, messagingMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ]);
  if (!(await messagingMod.isSupported())) return null;

  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    });

  // Usa o sw.ts do PWA (ele trata o evento "push"), não o firebase-messaging-sw.js.
  const registro = await navigator.serviceWorker.ready;
  return messagingMod.getToken(messagingMod.getMessaging(app), {
    vapidKey: env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registro,
  });
}

/**
 * Inscreve o aparelho no aviso do pedido. Com `pedirPermissao`, abre o pedido de
 * permissão do sistema (precisa vir de um toque do usuário, exigência do iOS).
 * Retorna o estado final.
 */
export async function ativarAvisoPedido(
  pedidoId: string,
  pedirPermissao: boolean,
): Promise<EstadoPush> {
  let estado = estadoPush();
  if (estado === 'pendente' && pedirPermissao) {
    const resultado = await Notification.requestPermission();
    estado = resultado === 'granted' ? 'ativo' : estadoPush();
  }
  if (estado !== 'ativo') return estado;

  const token = await obterTokenFcm();
  if (!token) return 'indisponivel';
  await pedidoService.inscreverPush(pedidoId, token);
  return 'ativo';
}

/** Pedidos locais mais antigos que isso não recebem mais aviso. */
const JANELA_PEDIDOS_MS = 1000 * 60 * 60 * 24;

/**
 * Com a permissão já dada, inscreve o aparelho nos pedidos recentes dele. A API
 * ignora os que já estão prontos. Chamado ao abrir o app e ao ativar o aviso.
 */
export async function inscreverPedidosRecentes(): Promise<void> {
  if (estadoPush() !== 'ativo') return;
  const limite = Date.now() - JANELA_PEDIDOS_MS;
  const recentes = (await loadPedidosLocais()).filter(
    (p) => new Date(p.createdAt).getTime() >= limite,
  );
  if (recentes.length === 0) return;

  const token = await obterTokenFcm();
  if (!token) return;
  await Promise.allSettled(
    recentes.map((p) => pedidoService.inscreverPush(p.id, token)),
  );
}

const DISPENSADO_KEY = 'foodhope-notificacao-dispensada-em';
const DISPENSA_MS = 1000 * 60 * 60 * 24 * 3;

export function notificacaoDispensadaRecentemente(): boolean {
  try {
    const em = Number(localStorage.getItem(DISPENSADO_KEY));
    return Number.isFinite(em) && em > 0 && Date.now() - em < DISPENSA_MS;
  } catch {
    return false;
  }
}

export function dispensarNotificacao(): void {
  try {
    localStorage.setItem(DISPENSADO_KEY, String(Date.now()));
  } catch {
    return;
  }
}

/**
 * O convite de notificação vem antes do de instalar: até ele ser decidido
 * (não aparece ou foi fechado), o de instalar espera.
 */
export const CONVITE_PUSH_DECIDIDO_EVENT = 'foodhope:convite-push-decidido';
let convitePushDecidido = false;
export function isConvitePushDecidido(): boolean {
  return convitePushDecidido;
}
export function marcarConvitePushDecidido(): void {
  if (convitePushDecidido) return;
  convitePushDecidido = true;
  window.dispatchEvent(new Event(CONVITE_PUSH_DECIDIDO_EVENT));
}
