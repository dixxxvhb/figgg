import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Bell, BellOff, Radio, Clock, Users, User, Music } from 'lucide-react';
import { Competition, CompetitionDance, CompetitionScheduleEntry, DanceCategory } from '../types';
import { getScheduleForCompetition } from '../data/competitionSchedules';

const categoryLabels: Record<DanceCategory, string> = {
  'production': 'Production',
  'large-group': 'Large Group',
  'small-group': 'Small Group',
  'trio': 'Trio',
  'duet': 'Duet',
  'solo': 'Solo',
};

function parseScheduledTime(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 0, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

function buildDateTime(performanceDate: string, scheduledTime: string): Date {
  const base = parseISO(performanceDate);
  const { hours, minutes } = parseScheduledTime(scheduledTime);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0, 0);
}

function computeLivePositions(
  caaEntries: CompetitionScheduleEntry[],
  now: Date
): { nowIdx: number; nextIdx: number; deckIdx: number } {
  let nowIdx = -1;
  for (let i = 0; i < caaEntries.length; i++) {
    const entryTime = buildDateTime(caaEntries[i].performanceDate, caaEntries[i].scheduledTime);
    if (entryTime <= now) {
      nowIdx = i;
    } else {
      break;
    }
  }
  if (nowIdx === -1) {
    return { nowIdx: -1, nextIdx: 0, deckIdx: caaEntries.length > 1 ? 1 : -1 };
  }
  const nextIdx = nowIdx + 1 < caaEntries.length ? nowIdx + 1 : -1;
  const deckIdx = nowIdx + 2 < caaEntries.length ? nowIdx + 2 : -1;
  return { nowIdx, nextIdx, deckIdx };
}

type LiveStatus = 'now' | 'next' | 'deck' | 'past' | 'upcoming' | 'non-caa';

interface LiveEntry {
  entry: CompetitionScheduleEntry;
  status: LiveStatus;
  dance: CompetitionDance | undefined;
}

interface LiveTabProps {
  competition: Competition;
  competitionDances: CompetitionDance[];
}

export function LiveTab({ competition, competitionDances }: LiveTabProps) {
  const [now, setNow] = useState(() => new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('comp-notifications-enabled') === 'true';
  });
  const nowEntryRef = useRef<HTMLDivElement | null>(null);
  const notificationTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevNowId = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const fullSchedule = useMemo(() => getScheduleForCompetition(competition.id), [competition.id]);
  const todayStr = format(now, 'yyyy-MM-dd');

  const todayEntries = useMemo(() => {
    return fullSchedule.filter(e => e.performanceDate === todayStr).sort((a, b) => a.entryNumber - b.entryNumber);
  }, [fullSchedule, todayStr]);

  const caaEntries = useMemo(() => todayEntries.filter(e => e.danceId), [todayEntries]);

  const allDates = useMemo(() => {
    return [...new Set(fullSchedule.map(e => e.performanceDate))].sort();
  }, [fullSchedule]);

  const isCompetitionDay = allDates.includes(todayStr);
  const isWithinRange = allDates.length > 0 && todayStr >= allDates[0] && todayStr <= allDates[allDates.length - 1];

  const { nowIdx, nextIdx, deckIdx } = useMemo(() => {
    if (caaEntries.length === 0) return { nowIdx: -1, nextIdx: -1, deckIdx: -1 };
    return computeLivePositions(caaEntries, now);
  }, [caaEntries, now]);

  const statusMap = useMemo(() => {
    const map = new Map<string, LiveStatus>();
    if (nowIdx >= 0) map.set(caaEntries[nowIdx].id, 'now');
    if (nextIdx >= 0) map.set(caaEntries[nextIdx].id, 'next');
    if (deckIdx >= 0) map.set(caaEntries[deckIdx].id, 'deck');
    caaEntries.forEach((entry, i) => {
      if (!map.has(entry.id)) {
        map.set(entry.id, nowIdx >= 0 && i < nowIdx ? 'past' : 'upcoming');
      }
    });
    return map;
  }, [caaEntries, nowIdx, nextIdx, deckIdx]);

  const liveEntries: LiveEntry[] = useMemo(() => {
    return todayEntries.map(entry => {
      const isCaa = !!entry.danceId;
      const status: LiveStatus = isCaa ? (statusMap.get(entry.id) || 'upcoming') : 'non-caa';
      const dance = isCaa ? competitionDances.find(d => d.id === entry.danceId) : undefined;
      return { entry, status, dance };
    });
  }, [todayEntries, statusMap, competitionDances]);

  const countdownMinutes = useMemo(() => {
    if (nextIdx < 0) return null;
    const nextEntry = caaEntries[nextIdx];
    const nextTime = buildDateTime(nextEntry.performanceDate, nextEntry.scheduledTime);
    const diffMs = nextTime.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / 60_000);
  }, [caaEntries, nextIdx, now]);

  const currentNowId = nowIdx >= 0 ? caaEntries[nowIdx]?.id : null;
  useEffect(() => {
    if (currentNowId && currentNowId !== prevNowId.current) {
      prevNowId.current = currentNowId;
      setTimeout(() => {
        nowEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [currentNowId]);


  const clearAllTimeouts = useCallback(() => {
    notificationTimeouts.current.forEach(id => clearTimeout(id));
    notificationTimeouts.current = [];
  }, []);

  const scheduleNotifications = useCallback(() => {
    clearAllTimeouts();
    if (!notificationsEnabled || typeof Notification === 'undefined') return;
    caaEntries.forEach((entry, idx) => {
      const dance = competitionDances.find(d => d.id === entry.danceId);
      const danceName = dance?.registrationName || 'Entry #' + entry.entryNumber;
      const entryTime = buildDateTime(entry.performanceDate, entry.scheduledTime);
      const msUntilTenMin = entryTime.getTime() - 10 * 60_000 - Date.now();
      if (msUntilTenMin > 0) {
        const tid = setTimeout(() => {
          new Notification(danceName + ' in ~10 minutes', {
            body: 'Entry #' + entry.entryNumber + ' -- ' + entry.scheduledTime,
          });
        }, msUntilTenMin);
        notificationTimeouts.current.push(tid);
      }
      if (idx > 0) {
        const prevTime = buildDateTime(caaEntries[idx - 1].performanceDate, caaEntries[idx - 1].scheduledTime);
        const msUntilNext = prevTime.getTime() - Date.now();
        if (msUntilNext > 0) {
          const tid = setTimeout(() => {
            new Notification(danceName + ' is UP NEXT!', {
              body: 'Entry #' + entry.entryNumber + ' -- ' + entry.scheduledTime,
            });
          }, msUntilNext);
          notificationTimeouts.current.push(tid);
        }
      } else {
        const msUntil = entryTime.getTime() - 5 * 60_000 - Date.now();
        if (msUntil > 0) {
          const tid = setTimeout(() => {
            new Notification(danceName + ' is UP NEXT!', {
              body: 'Entry #' + entry.entryNumber + ' -- ' + entry.scheduledTime,
            });
          }, msUntil);
          notificationTimeouts.current.push(tid);
        }
      }
    });
  }, [caaEntries, competitionDances, notificationsEnabled, clearAllTimeouts]);

  useEffect(() => {
    if (notificationsEnabled) { scheduleNotifications(); } else { clearAllTimeouts(); }
    return () => clearAllTimeouts();
  }, [notificationsEnabled, scheduleNotifications, clearAllTimeouts]);

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.setItem('comp-notifications-enabled', 'false');
      return;
    }
    if (typeof Notification === 'undefined') {
      alert('Notifications are not supported in this browser.');
      return;
    }
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      localStorage.setItem('comp-notifications-enabled', 'true');
    } else {
      alert('Notification permission was denied. Please enable it in browser settings.');
    }
  };

  const statusStyles: Record<LiveStatus, string> = {
    now: 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-600',
    next: 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 dark:border-amber-500',
    deck: 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-500',
    past: 'bg-white dark:bg-blush-800/50 border-blush-200 dark:border-blush-700 opacity-50',
    upcoming: 'bg-white dark:bg-blush-800 border-blush-200 dark:border-blush-700',
    'non-caa': 'bg-blush-50 dark:bg-blush-800/40 border-blush-100 dark:border-blush-700/50',
  };

  const statusBadge: Partial<Record<LiveStatus, { text: string; className: string }>> = {
    now: { text: 'NOW', className: 'bg-green-600 text-white' },
    next: { text: 'UP NEXT', className: 'bg-amber-500 text-white' },
    deck: { text: 'ON DECK', className: 'bg-orange-500 text-white' },
  };

  if (!isCompetitionDay && !isWithinRange) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-forest-100 dark:bg-forest-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Radio className="text-forest-400" size={32} />
        </div>
        <h2 className="font-semibold text-forest-700 dark:text-white mb-2">Live View</h2>
        <p className="text-sm text-forest-400 dark:text-blush-400 mb-1">
          The live tracker will activate on competition days.
        </p>
        <p className="text-sm text-forest-400 dark:text-blush-400">
          {allDates.length > 0
            ? 'Competition dates: ' + format(parseISO(allDates[0]), 'MMM d') + ' to ' + format(parseISO(allDates[allDates.length - 1]), 'MMM d, yyyy')
            : 'No schedule loaded yet.'}
        </p>
      </div>
    );
  }

  if (todayEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-forest-100 dark:bg-forest-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Radio className="text-forest-400" size={32} />
        </div>
        <h2 className="font-semibold text-forest-700 dark:text-white mb-2">No Entries Today</h2>
        <p className="text-sm text-forest-400 dark:text-blush-400">
          No CAA entries are scheduled for {format(now, 'EEEE, MMM d')}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 px-4 pb-3 pt-1 bg-gradient-to-b from-blush-50 via-blush-50 to-transparent dark:from-blush-900 dark:via-blush-900">
        <div className="flex items-center justify-between bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Radio size={20} className="text-green-600 dark:text-green-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-semibold text-forest-700 dark:text-white">
                {format(now, 'EEEE, MMM d')}
              </div>
              {countdownMinutes !== null && countdownMinutes > 0 ? (
                <div className="text-xs text-forest-500 dark:text-blush-400 flex items-center gap-1">
                  <Clock size={12} />
                  Next in: <span className="font-semibold text-amber-600 dark:text-amber-400">{countdownMinutes} min</span>
                </div>
              ) : countdownMinutes === 0 ? (
                <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                  Next entry starting now
                </div>
              ) : caaEntries.length > 0 && nowIdx === caaEntries.length - 1 ? (
                <div className="text-xs text-forest-500 dark:text-blush-400">
                  Last CAA entry performing
                </div>
              ) : (
                <div className="text-xs text-forest-500 dark:text-blush-400">
                  {caaEntries.length} CAA entries today
                </div>
              )}
            </div>
          </div>
          <button
            onClick={toggleNotifications}
            className={notificationsEnabled
              ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
              : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blush-100 dark:bg-blush-700 text-forest-500 dark:text-blush-300'
            }
            title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            <span className="hidden sm:inline">
              {notificationsEnabled ? 'Alerts On' : 'Alerts Off'}
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-2 mt-1">
        {liveEntries.map(({ entry, status, dance }) => {
          const isNow = status === 'now';
          const isCaa = status !== 'non-caa';
          const badge = statusBadge[status];

          return (
            <div
              key={entry.id}
              ref={isNow ? nowEntryRef : undefined}
              className={'rounded-xl border-l-4 transition-all duration-300 ' + statusStyles[status] + ' ' + (!isCaa ? 'py-2 px-3' : 'p-3')}
            >
              {!isCaa ? (
                <div className="flex items-center gap-2 text-xs text-forest-400 dark:text-blush-500">
                  <span className="font-mono text-forest-300 dark:text-blush-600 w-8">#{entry.entryNumber}</span>
                  <span>{entry.scheduledTime}</span>
                  <span className="mx-0.5">DD</span>
                  <span className="capitalize">{entry.category.replace('-', ' ')}</span>
                  <span className="capitalize">{entry.style}</span>
                  <span className="text-forest-300 dark:text-blush-600">{entry.ageGroup}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm text-forest-400 dark:text-blush-400 flex-shrink-0">
                        #{entry.entryNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-forest-700 dark:text-white truncate">
                          {dance?.registrationName || entry.danceId}
                        </div>
                        {dance && (
                          <div className="text-xs text-forest-500 dark:text-blush-400 flex items-center gap-1 truncate">
                            <Music size={10} className="flex-shrink-0" />
                            <span className="truncate">{dance.songTitle}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {badge && (
                        <span className={'text-xs font-bold px-2.5 py-1 rounded-full ' + badge.className}>
                          {badge.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-forest-400 dark:text-blush-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {entry.scheduledTime}
                    </span>
                    <span className="capitalize px-1.5 py-0.5 rounded bg-forest-100/50 dark:bg-blush-700/50">
                      {categoryLabels[entry.category]}
                    </span>
                    <span className="capitalize">{entry.style.replace('-', ' ')}</span>
                    <span className="flex items-center gap-1">
                      {entry.category === 'solo' ? <User size={11} /> : <Users size={11} />}
                      {entry.dancers.length <= 3 ? entry.dancers.join(', ') : entry.dancers.length + ' dancers'}
                    </span>
                  </div>
                  {(status === 'next' || status === 'deck') && (
                    <div className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      Call time: {entry.callTime}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-xs text-forest-300 dark:text-blush-600">
        Updates every 30 seconds -- {format(now, 'h:mm:ss a')}
      </div>
    </div>
  );
}
