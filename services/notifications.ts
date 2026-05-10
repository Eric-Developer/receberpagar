import { db } from '@/database/database';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function montarDataVencimento(item: {
  dia_vencimento: number;
  mes: number;
  ano: number;
}) {
  const dueDate = new Date(item.ano, item.mes - 1, item.dia_vencimento, 9, 0, 0);
  if (isNaN(dueDate.getTime())) {
    return null;
  }
  return dueDate;
}

function resolverGatilhoLembrete(dueDate: Date) {
  const twoDaysBefore = new Date(dueDate.getTime());
  twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);

  const now = new Date();
  if (dueDate.getTime() <= now.getTime()) {
    return { mode: 'overdue' as const, date: now };
  }

  if (twoDaysBefore.getTime() <= now.getTime()) {
    return { mode: 'due' as const, date: dueDate };
  }

  return { mode: 'near' as const, date: twoDaysBefore };
}

/** Solicita permissão para enviar notificações locais (Fluxo). */
export async function solicitarPermissaoNotificacao() {
  const settings = await Notifications.getPermissionsAsync();

  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const permission = await Notifications.requestPermissionsAsync();
  return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function podeNotificar() {
  const granted = await solicitarPermissaoNotificacao();
  if (!granted) {
    console.log('Notificações sem permissão no sistema.');
  }
  return granted;
}

/** Canal Android + permissões — chamar na subida do app. */
export async function inicializarNotificacoesFluxo() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  await solicitarPermissaoNotificacao();
}

export async function cancelarNotificacaoAgendada(notificationId?: string) {
  if (!notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.log('Erro ao cancelar notificação:', error);
  }
}

/** Confirmação imediata após registrar entrada/saída no Fluxo. */
export async function notificarMovimentoRegistrado(item: {
  tipo: 'RECEBER' | 'PAGAR';
  nome: string;
  valor: number;
}) {
  if (!(await podeNotificar())) return;

  const title = item.tipo === 'RECEBER' ? 'Fluxo · Entrada registrada' : 'Fluxo · Saída registrada';
  const body = `${item.tipo === 'RECEBER' ? 'Entrada' : 'Saída'} ${item.nome} · R$ ${item.valor.toFixed(2)}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    },
  });
}

function montarTextoLembreteConta(item: {
  tipo: 'RECEBER' | 'PAGAR';
  nome: string;
  valor: number;
  parcelas: number;
  dia_vencimento: number;
}) {
  const subtitle = item.tipo === 'RECEBER' ? 'Entrada prevista' : 'Saída prevista';
  const body = `${subtitle}: ${item.nome} (${item.parcelas}x). Total R$ ${item.valor.toFixed(2)}`;

  return {
    title: item.tipo === 'RECEBER' ? 'Fluxo · Lembrete de entrada' : 'Fluxo · Lembrete de saída',
    body,
    sound: 'default',
  };
}

/** Agenda um lembrete de vencimento para uma conta pendente na tabela `contas`. */
export async function agendarLembreteVencimentoConta(item: {
  id: number;
  tipo: 'RECEBER' | 'PAGAR';
  nome: string;
  valor: number;
  parcelas: number;
  dia_vencimento: number;
  mes: number;
  ano: number;
  status: string;
  notification_id?: string;
}) {
  if (!(await podeNotificar())) return null;

  if (item.status !== 'PENDENTE') {
    return null;
  }

  const dueDate = montarDataVencimento(item);
  if (!dueDate) {
    return null;
  }

  const triggerInfo = resolverGatilhoLembrete(dueDate);

  if (item.notification_id) {
    await cancelarNotificacaoAgendada(item.notification_id);
  }

  const triggerPayload =
    triggerInfo.mode === 'overdue'
      ? ({
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 60 * 60 * 24,
          repeats: true,
        } as const)
      : ({
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerInfo.date,
        } as const);

  const titleBase =
    item.tipo === 'RECEBER'
      ? triggerInfo.mode === 'overdue'
        ? 'Fluxo · Entrada em atraso'
        : triggerInfo.mode === 'near'
          ? 'Fluxo · Entrada próxima'
          : 'Fluxo · Entrada vence hoje'
      : triggerInfo.mode === 'overdue'
        ? 'Fluxo · Saída em atraso'
        : triggerInfo.mode === 'near'
          ? 'Fluxo · Saída próxima'
          : 'Fluxo · Saída vence hoje';

  const bodyExtra =
    triggerInfo.mode === 'overdue'
      ? 'Está em atraso. Abra o app para registrar.'
      : triggerInfo.mode === 'near'
        ? 'Faltam poucos dias. Abra o app para se organizar.'
        : 'Vence hoje. Abra o app para registrar.';

  try {
    const textoBase = montarTextoLembreteConta(item);
    if (triggerInfo.mode === 'overdue') {
      // Em atraso: avisa agora e mantém lembrete diário.
      await Notifications.scheduleNotificationAsync({
        content: {
          ...textoBase,
          title: titleBase,
          body: `${textoBase.body} ${bodyExtra}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
        },
      });
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        ...textoBase,
        title: titleBase,
        body: `${textoBase.body} ${bodyExtra}`,
      },
      trigger: triggerPayload,
    });

    if (identifier) {
      db.runSync(
        `UPDATE contas SET notification_id = ? WHERE id = ?`,
        [identifier, item.id]
      );
    }

    return identifier;
  } catch (error) {
    console.log('Erro ao agendar notificação:', error);
    return null;
  }
}

/** Reconcilia lembretes com todas as contas ainda pendentes (ex.: ao abrir o app). */
export async function sincronizarLembretesContasPendentes() {
  try {
    const pendingItems = db.getAllSync<{
      id: number;
      tipo: 'RECEBER' | 'PAGAR';
      nome: string;
      valor: number;
      parcelas: number;
      dia_vencimento: number;
      mes: number;
      ano: number;
      status: string;
      notification_id?: string;
    }>(
      `SELECT id, tipo, nome, valor, parcelas, dia_vencimento, mes, ano, status, notification_id
       FROM contas
       WHERE status = 'PENDENTE'`
    );

    for (const item of pendingItems) {
      await agendarLembreteVencimentoConta(item);
    }
  } catch (error) {
    console.log('Erro ao sincronizar notificações:', error);
  }
}
