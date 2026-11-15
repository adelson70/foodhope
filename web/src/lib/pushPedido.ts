// Aviso de "pedido pronto" por Firebase Cloud Messaging.
// Android: funciona no navegador e no app instalado. iOS (16.4+): só com o app
// adicionado à tela de início; no Safari comum não existe Web Push.
import { pedidoService } from '../services/pedido.service';
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
