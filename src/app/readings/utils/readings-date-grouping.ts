import type { LocalGlucoseReading } from '@models/glucose-reading.model';
import type { GroupedReading } from '../components/readings-list/readings-list.component';

export function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function parseLocalDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return new Date(dateKey);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, monthIndex, day);
}

export function formatReadingsDateHeader(
  dateKey: string,
  options: {
    language: string;
    translate: (key: string) => string;
    now?: Date;
  }
): string {
  const now = options.now ?? new Date();
  const todayKey = getLocalDateKey(now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  if (dateKey === todayKey) return options.translate('common.today');
  if (dateKey === yesterdayKey) return options.translate('common.yesterday');

  const date = parseLocalDateKey(dateKey);
  return date.toLocaleDateString(options.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function groupReadingsByLocalDate(
  readings: LocalGlucoseReading[],
  options: {
    language: string;
    translate: (key: string) => string;
    now?: Date;
  }
): GroupedReading[] {
  const groups = new Map<string, LocalGlucoseReading[]>();
  readings.forEach(reading => {
    const dateKey = getLocalDateKey(new Date(reading.time));
    const group = groups.get(dateKey);
    if (group) {
      group.push(reading);
    } else {
      groups.set(dateKey, [reading]);
    }
  });

  const grouped: GroupedReading[] = Array.from(groups.entries()).map(([date, groupReadings]) => ({
    date,
    displayDate: formatReadingsDateHeader(date, options),
    readings: groupReadings.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
  }));

  return grouped.sort((a, b) => b.date.localeCompare(a.date));
}
