import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { 
  Calendar, 
  Trophy, 
  Grid3X3, 
  ChevronRight, 
  Users, 
  FileText,
  Music,
  ClipboardList,
  ListOrdered,
  Play,
  Zap,
  Clock
} from 'lucide-react';
import { useCurrentClass } from '../hooks/useCurrentClass';
import { useAppData } from '../hooks/useAppData';
import { getCurrentDayOfWeek } from '../utils/time';
import { getClassesByDay } from '../data/classes';
import { getScheduleForCompetition } from '../data/competitionSchedules';

export function Dashboard() {
  const { data } = useAppData();

  const currentDay = useMemo(() => getCurrentDayOfWeek(), []);
  const todayClasses = useMemo(
    () => getClassesByDay(data.classes, currentDay),
    [data.classes, currentDay]
  );

  const classInfo = useCurrentClass(data.classes);

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayIndex = daysOfWeek.indexOf(currentDay);
  
  const nextTeachingDay = useMemo(() => {
    if (todayClasses.length > 0) return null;
    
    for (let i = 1; i <= 7; i++) {
      const checkDay = daysOfWeek[(todayIndex + i) % 7];
      const classes = getClassesByDay(data.classes, checkDay);
      if (classes.length > 0) {
        return { day: checkDay, classes };
      }
    }
    return null;
  }, [data.classes, todayClasses, todayIndex]);

  const upcomingCompetitions = useMemo(() => {
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    return data.competitions
      .filter(c => {
        const compDate = new Date(c.date);
        return compDate >= new Date() && compDate <= twoWeeksFromNow;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data.competitions]);

  const nextComp = upcomingCompetitions[0];
  const daysUntilNextComp = nextComp
    ? differenceInDays(new Date(nextComp.date), new Date())
    : null;

  const dancesWithFormations = useMemo(() => {
    return data.competitionDances.filter(d => d.formations && d.formations.length > 0).length;
  }, [data.competitionDances]);

  const dayName = format(new Date(), 'EEEE');
  const dateStr = format(new Date(), 'MMMM d');
  const timeStr = format(new Date(), 'h:mm a');

  return (
    <div className="min-h-full overflow-y-auto pb-24">
      {/* Hero Header - Dark Forest Green */}
      <div className="relative overflow-hidden bg-forest-700">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-800 via-forest-700 to-forest-600" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,240,241,0.1),transparent_50%)]" />
        
        <div className="relative max-w-lg mx-auto px-4 pt-8 pb-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-blush-300 text-sm font-medium tracking-wide uppercase">{dateStr}</p>
              <h1 className="text-4xl font-bold text-white tracking-tight">{dayName}</h1>
            </div>
            <div className="flex items-center gap-1.5 text-blush-200/70 text-sm">
              <Clock size={14} />
              <span>{timeStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        
        {/* Current/Next Class - Floating Card */}
        {classInfo.class && (classInfo.status === 'during' || classInfo.status === 'before') && (
          <Link
            to={`/class/${classInfo.class.id}/notes`}
            className="block bg-forest-700 rounded-2xl p-4 hover-lift shadow-xl border border-forest-600"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blush-300 to-blush-400 flex items-center justify-center shadow-lg">
                <Play size={24} className="text-forest-700 ml-0.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-blush-300 text-xs font-bold uppercase tracking-wider">
                    {classInfo.status === 'during' ? '● LIVE NOW' : 'Up Next'}
                  </span>
                  {classInfo.status === 'during' && (
                    <span className="w-2 h-2 bg-blush-300 rounded-full animate-pulse" />
                  )}
                </div>
                <div className="text-white font-semibold text-lg mt-0.5">{classInfo.class.name}</div>
                <div className="text-blush-200/70 text-sm">
                  {classInfo.timeUntilStart && classInfo.status === 'before' 
                    ? `Starts in ${classInfo.timeUntilStart} min`
                    : classInfo.timeRemaining 
                      ? `${classInfo.timeRemaining} min remaining`
                      : ''}
                </div>
              </div>
              <ChevronRight size={24} className="text-blush-300/60" />
            </div>
          </Link>
        )}

        {/* TEACHING SECTION */}
        <div className="bg-white rounded-2xl overflow-hidden hover-lift shadow-lg border border-blush-200 group">
          <Link 
            to="/schedule" 
            className="flex items-center gap-4 p-5"
          >
            <div className="w-14 h-14 rounded-xl bg-forest-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Calendar className="text-blush-200" size={26} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-forest-700 text-lg">Teaching</h2>
                <Zap size={14} className="text-blush-400" />
              </div>
              <p className="text-forest-400 text-sm">
                {todayClasses.length > 0 
                  ? `${todayClasses.length} class${todayClasses.length > 1 ? 'es' : ''} today`
                  : nextTeachingDay 
                    ? `Next: ${nextTeachingDay.day.charAt(0).toUpperCase() + nextTeachingDay.day.slice(1)}`
                    : 'No classes scheduled'
                }
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blush-100 flex items-center justify-center group-hover:bg-blush-200 transition-colors">
              <ChevronRight size={20} className="text-forest-600" />
            </div>
          </Link>
          
          <div className="flex border-t border-blush-100">
            <Link 
              to="/schedule" 
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
            >
              <Calendar size={16} />
              Schedule
            </Link>
            <div className="w-px bg-blush-100" />
            <Link 
              to="/students" 
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
            >
              <Users size={16} />
              Students
            </Link>
            <div className="w-px bg-blush-100" />
            <Link 
              to="/plan" 
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
            >
              <FileText size={16} />
              Plan
            </Link>
          </div>
        </div>

        {/* COMPETITION SECTION */}
        <div className={`bg-white rounded-2xl overflow-hidden hover-lift shadow-lg border group ${nextComp ? 'border-blush-300 ring-2 ring-blush-200' : 'border-blush-200'}`}>
          <Link 
            to="/competitions" 
            className="flex items-center gap-4 p-5"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blush-400 to-blush-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Trophy className="text-white" size={26} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-forest-700 text-lg">Competition</h2>
                {nextComp && <span className="text-xs bg-blush-100 text-blush-600 px-2 py-0.5 rounded-full font-semibold">SOON</span>}
              </div>
              {nextComp ? (
                <p className="text-forest-400 text-sm">{nextComp.name}</p>
              ) : (
                <p className="text-forest-400 text-sm">
                  {data.competitionDances.length} dance{data.competitionDances.length !== 1 ? 's' : ''} registered
                </p>
              )}
            </div>
            {nextComp && daysUntilNextComp !== null ? (
              <div className="text-right">
                <div className="text-4xl font-black text-blush-500 leading-none">
                  {daysUntilNextComp}
                </div>
                <div className="text-xs text-forest-400 font-medium uppercase tracking-wide">days</div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blush-100 flex items-center justify-center group-hover:bg-blush-200 transition-colors">
                <ChevronRight size={20} className="text-blush-500" />
              </div>
            )}
          </Link>
          
          <div className="flex border-t border-blush-100">
            <Link 
              to="/dances" 
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
            >
              <Music size={16} />
              Dances
            </Link>
            <div className="w-px bg-blush-100" />
            {nextComp && getScheduleForCompetition(nextComp.id).length > 0 ? (
              <Link 
                to={`/competition/${nextComp.id}/schedule`}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
              >
                <ListOrdered size={16} />
                Schedule
              </Link>
            ) : (
              <Link 
                to="/competitions" 
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
              >
                <ListOrdered size={16} />
                Events
              </Link>
            )}
            <div className="w-px bg-blush-100" />
            {nextComp ? (
              <Link 
                to={`/competition/${nextComp.id}/checklist`}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
              >
                <ClipboardList size={16} />
                Checklist
              </Link>
            ) : (
              <Link 
                to="/competitions" 
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
              >
                <ClipboardList size={16} />
                Checklist
              </Link>
            )}
          </div>
        </div>

        {/* CHOREOGRAPHY SECTION */}
        <div className="bg-white rounded-2xl overflow-hidden hover-lift shadow-lg border border-blush-200 group">
          <Link 
            to="/formations" 
            className="flex items-center gap-4 p-5"
          >
            <div className="w-14 h-14 rounded-xl bg-forest-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Grid3X3 className="text-blush-200" size={26} />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-forest-700 text-lg">Choreography</h2>
              <p className="text-forest-400 text-sm">
                {dancesWithFormations > 0 
                  ? `${dancesWithFormations} dance${dancesWithFormations > 1 ? 's' : ''} with formations`
                  : 'Formations & staging'
                }
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blush-100 flex items-center justify-center group-hover:bg-blush-200 transition-colors">
              <ChevronRight size={20} className="text-forest-600" />
            </div>
          </Link>
          
          <div className="flex border-t border-blush-100">
            <Link 
              to="/formations" 
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
            >
              <Grid3X3 size={16} />
              Formations
            </Link>
            <div className="w-px bg-blush-100" />
            <Link 
              to="/library" 
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-forest-600 hover:bg-blush-50 transition-colors font-medium"
            >
              <FileText size={16} />
              Library
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
