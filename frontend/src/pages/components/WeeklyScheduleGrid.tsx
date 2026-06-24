import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export interface ScheduleEvent {
  day_of_week: string;
  start_time: string; // e.g. "08:00" or "08:00:00"
  end_time: string;
  title?: string;
  subtitle?: string;
  colorClass?: string;
}

interface WeeklyScheduleGridProps {
  events: ScheduleEvent[];
  startHour?: number;
  endHour?: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = ({ 
  events, 
  startHour: preferredStart = 7, 
  endHour: preferredEnd = 19 
}) => {
  // Parse time "HH:MM" or "HH:MM:SS" into decimal hours
  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    return h + m / 60;
  };

  // Determine dynamic range
  let startHour = preferredStart;
  let endHour = preferredEnd;

  events.forEach(evt => {
    const s = Math.floor(parseTime(evt.start_time));
    const e = Math.ceil(parseTime(evt.end_time));
    if (s < startHour) startHour = s;
    if (e > endHour) endHour = e;
  });

  const hours = [];
  for (let i = startHour; i <= endHour; i++) {
    hours.push(i);
  }

  const colors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
  ];

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">Weekly Schedule View</h3>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px] p-4">
          <div className="grid border border-gray-200 rounded-lg overflow-hidden relative" 
               style={{ 
                 gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)`,
                 gridTemplateRows: `40px repeat(${(endHour - startHour) * 2}, 36px)` 
               }}>
            
            {/* Header row: Days */}
            <div className="bg-gray-50 border-b border-r border-gray-200" style={{ gridColumn: 1, gridRow: 1 }}></div>
            {DAYS.map((day, idx) => (
              <div 
                key={day} 
                className="bg-gray-50 border-b border-r border-gray-200 flex items-center justify-center font-medium text-xs text-gray-600 uppercase tracking-wider"
                style={{ gridColumn: idx + 2, gridRow: 1 }}
              >
                {day}
              </div>
            ))}

            {/* Grid rows: Time slots */}
            {hours.map((hour, idx) => {
              const rowStart = idx * 2 + 2;
              if (idx === hours.length - 1) return null;
              
              return (
                <React.Fragment key={`hour-${hour}`}>
                  <div className="border-r border-gray-200 text-xs text-gray-500 font-medium px-2 py-1 sticky left-0 bg-white z-10" 
                       style={{ gridColumn: 1, gridRow: `${rowStart} / span 2` }}>
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </div>
                  {DAYS.map((_, dayIdx) => (
                    <React.Fragment key={`cell-${hour}-${dayIdx}`}>
                      <div className="border-b border-r border-gray-100 border-dashed" style={{ gridColumn: dayIdx + 2, gridRow: rowStart }}></div>
                      <div className="border-b border-r border-gray-200" style={{ gridColumn: dayIdx + 2, gridRow: rowStart + 1 }}></div>
                    </React.Fragment>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Day Columns Container for Events (Absolute positioning layer) */}
            {/* We use the same grid positions but place a container inside or just overlay */}
            {DAYS.map((day, dayIdx) => {
              const dayEvents = events.filter(e => e.day_of_week === day);
              if (dayEvents.length === 0) return null;

              // Lane calculation logic
              const sortedEvents = [...dayEvents].sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
              const lanes: ScheduleEvent[][] = [];
              
              const positionedEvents = sortedEvents.map(evt => {
                const s = parseTime(evt.start_time);
                const e = parseTime(evt.end_time);
                
                let laneIndex = 0;
                while (lanes[laneIndex]?.some(laneEvt => {
                  const ls = parseTime(laneEvt.start_time);
                  const le = parseTime(laneEvt.end_time);
                  return (s < le && e > ls);
                })) {
                  laneIndex++;
                }

                if (!lanes[laneIndex]) lanes[laneIndex] = [];
                lanes[laneIndex].push(evt);
                return { evt, laneIndex };
              });

              return (
                <div 
                  key={`day-col-${day}`}
                  className="relative pointer-events-none"
                  style={{ 
                    gridColumn: dayIdx + 2, 
                    gridRow: `2 / span ${(endHour - startHour) * 2}`,
                  }}
                >
                  {positionedEvents.map(({ evt, laneIndex }, idx) => {
                    const startDec = parseTime(evt.start_time);
                    const endDec = parseTime(evt.end_time);
                    
                    if (endDec <= startHour || startDec >= endHour || startDec >= endDec) return null;

                    // Calculate position in % within the day column
                    const top = ((Math.max(startDec, startHour) - startHour) / (endHour - startHour)) * 100;
                    const height = ((Math.min(endDec, endHour) - Math.max(startDec, startHour)) / (endHour - startHour)) * 100;
                    
                    const width = 100 / lanes.length;
                    const left = laneIndex * width;

                    const colorClass = evt.colorClass || colors[idx % colors.length];

                    return (
                      <div 
                        key={`evt-${day}-${idx}`}
                        className={`absolute p-1.5 sm:p-2.5 rounded-lg border text-xs sm:text-sm shadow-sm flex flex-col overflow-hidden pointer-events-auto transition-all hover:z-20 hover:shadow-lg hover:scale-[1.02] cursor-help ${colorClass}`}
                        style={{ 
                          top: `${top}%`,
                          height: `${height}%`,
                          left: `${left}%`,
                          width: `${width}%`,
                          zIndex: 10 + laneIndex
                        }}
                        title={`${evt.title} - ${evt.subtitle}\n${evt.start_time.substring(0,5)} - ${evt.end_time.substring(0,5)}`}
                      >
                        <div className="font-bold truncate leading-none mb-0.5">{evt.title || "Course Session"}</div>
                        {evt.subtitle && <div className="text-[10px] sm:text-[11px] font-medium leading-tight truncate mb-1">{evt.subtitle}</div>}
                        <div className="mt-auto flex items-center gap-1 text-[10px] sm:text-[11px] font-bold pt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{evt.start_time.substring(0,5)} - {evt.end_time.substring(0,5)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyScheduleGrid;
