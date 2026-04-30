import { toZonedTime } from 'date-fns-tz';
import type { OpeningHours, Settings } from '@prisma/client';

const TZ = 'America/Sao_Paulo';

const DAY_LABELS_LONG: Record<number, string> = {
  0: 'domingo',
  1: 'segunda-feira',
  2: 'terça-feira',
  3: 'quarta-feira',
  4: 'quinta-feira',
  5: 'sexta-feira',
  6: 'sábado',
};

// Converte "HH:mm" em minutos desde 00:00
function timeToMinutes(hhmm: string): number {
  const parts = hhmm.split(':');
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
}

interface NowSnapshot {
  dayOfWeek: number; // 0..6 (0 = domingo)
  minutesFromMidnight: number; // minuto atual no fuso de SP
}

function nowInSP(): NowSnapshot {
  const zoned = toZonedTime(new Date(), TZ);
  return {
    dayOfWeek: zoned.getDay(),
    minutesFromMidnight: zoned.getHours() * 60 + zoned.getMinutes(),
  };
}

function indexByDay(hours: OpeningHours[]): Map<number, OpeningHours> {
  const map = new Map<number, OpeningHours>();
  for (const h of hours) map.set(h.dayOfWeek, h);
  return map;
}

/**
 * Retorna true se a loja está aberta agora.
 *
 * Considera:
 * - settings.isOpen (override manual do admin) — se false, sempre fechado
 * - turnos que cruzam meia-noite: se closeTime < openTime, o turno do dia D
 *   só termina em D+1 às closeTime. Por isso checamos hoje E ontem.
 */
export function isStoreOpen(settings: Settings, hours: OpeningHours[]): boolean {
  if (!settings.isOpen) return false;

  const { dayOfWeek, minutesFromMidnight } = nowInSP();
  const byDay = indexByDay(hours);

  // 1) Turno de HOJE
  const today = byDay.get(dayOfWeek);
  if (today && today.isOpen) {
    const open = timeToMinutes(today.openTime);
    const close = timeToMinutes(today.closeTime);
    if (close > open) {
      // Turno normal (não cruza meia-noite)
      if (minutesFromMidnight >= open && minutesFromMidnight < close) return true;
    } else {
      // Cruza meia-noite — fica aberto até 23:59 do dia atual
      if (minutesFromMidnight >= open) return true;
    }
  }

  // 2) Turno de ONTEM que continua atravessando meia-noite
  const yesterdayDow = (dayOfWeek + 6) % 7;
  const yesterday = byDay.get(yesterdayDow);
  if (yesterday && yesterday.isOpen) {
    const open = timeToMinutes(yesterday.openTime);
    const close = timeToMinutes(yesterday.closeTime);
    if (close <= open) {
      // Turno de ontem cruzou — fechamento é hoje em `close`
      if (minutesFromMidnight < close) return true;
    }
  }

  return false;
}

/**
 * Devolve um label amigável de quando a loja abre de novo.
 * Ex: "Abre hoje às 14:00", "Abre amanhã às 14:00", "Abre na quarta-feira às 14:00".
 * Se nenhum dia da semana tem isOpen=true, devolve null.
 */
export function getNextOpeningLabel(hours: OpeningHours[]): string | null {
  const { dayOfWeek, minutesFromMidnight } = nowInSP();
  const byDay = indexByDay(hours);

  for (let offset = 0; offset < 7; offset++) {
    const dow = (dayOfWeek + offset) % 7;
    const h = byDay.get(dow);
    if (!h || !h.isOpen) continue;

    const open = timeToMinutes(h.openTime);

    if (offset === 0) {
      // Só conta hoje se o horário de abertura ainda está no futuro
      if (minutesFromMidnight < open) {
        return `Abre hoje às ${h.openTime}`;
      }
      continue;
    }
    if (offset === 1) return `Abre amanhã às ${h.openTime}`;
    return `Abre ${DAY_LABELS_LONG[dow] ?? 'em breve'} às ${h.openTime}`;
  }

  return null;
}
