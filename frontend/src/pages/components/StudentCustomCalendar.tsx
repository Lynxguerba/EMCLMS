import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { EventInput } from "@fullcalendar/core";
import { Clock } from "lucide-react";

interface StudentCustomCalendarProps {
  calendarEvents: EventInput[];
}

function StudentCustomCalendar({ calendarEvents }: StudentCustomCalendarProps) {
  return (
    <div className="modern-calendar-wrapper">
      <style>{`
        .modern-calendar-wrapper .fc {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Calendar Header Styling */
        .modern-calendar-wrapper .fc .fc-toolbar {
          margin-bottom: 1.5rem;
          padding: 0;
        }

        .modern-calendar-wrapper .fc .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          background: linear-gradient(135deg, #0f2e6b 0%, #1e40af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modern-calendar-wrapper .fc .fc-button {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          font-weight: 600;
          text-transform: capitalize;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          transition: all 0.2s;
        }

        .modern-calendar-wrapper .fc .fc-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        .modern-calendar-wrapper .fc .fc-button:active,
        .modern-calendar-wrapper .fc .fc-button-active {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
          box-shadow: 0 1px 2px rgba(59, 130, 246, 0.2);
        }

        .modern-calendar-wrapper .fc .fc-button:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .modern-calendar-wrapper .fc .fc-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Day Headers */
        .modern-calendar-wrapper .fc .fc-col-header-cell {
          padding: 1rem 0.5rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border: none;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          color: #475569;
        }

        .modern-calendar-wrapper .fc .fc-col-header-cell:first-child {
          border-top-left-radius: 0.75rem;
        }

        .modern-calendar-wrapper .fc .fc-col-header-cell:last-child {
          border-top-right-radius: 0.75rem;
        }

        /* Day Cells */
        .modern-calendar-wrapper .fc .fc-daygrid-day {
          background: white;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
          position: relative;
        }

        .modern-calendar-wrapper .fc .fc-daygrid-day:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .modern-calendar-wrapper .fc .fc-daygrid-day-top {
          padding: 0.5rem;
          justify-content: center;
        }

        .modern-calendar-wrapper .fc .fc-daygrid-day-number {
          padding: 0.25rem 0.5rem;
          font-weight: 600;
          color: #475569;
          font-size: 0.875rem;
        }

        /* Today Highlight */
        .modern-calendar-wrapper .fc .fc-day-today {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
          border-color: #3b82f6 !important;
          position: relative;
        }

        .modern-calendar-wrapper .fc .fc-day-today .fc-daygrid-day-number {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border-radius: 0.5rem;
          padding: 0.25rem 0.5rem;
          font-weight: 700;
        }

        /* Weekend Days */
        .modern-calendar-wrapper .fc .fc-day-sat,
        .modern-calendar-wrapper .fc .fc-day-sun {
          background: #fafafa;
        }

        /* Other Month Days */
        .modern-calendar-wrapper .fc .fc-day-other {
          background: #f9fafb;
        }

        .modern-calendar-wrapper .fc .fc-day-other .fc-daygrid-day-number {
          color: #cbd5e1;
        }

        /* Events */
        .modern-calendar-wrapper .fc-daygrid-event {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
          margin: 0.125rem 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
        }

        .modern-calendar-wrapper .fc-daygrid-event:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
          transform: translateY(-1px);
          z-index: 10;
        }

        .modern-calendar-wrapper .fc-daygrid-event.fc-event-past {
          opacity: 0.6;
        }

        /* Event Dots */
        .modern-calendar-wrapper .fc .fc-daygrid-event-dot {
          border-color: #3b82f6;
          background: #3b82f6;
        }

        /* More Events Link */
        .modern-calendar-wrapper .fc .fc-daygrid-more-link {
          color: #3b82f6;
          font-weight: 600;
          font-size: 0.75rem;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
        }

        .modern-calendar-wrapper .fc .fc-daygrid-more-link:hover {
          background: #dbeafe;
          color: #1d4ed8;
        }

        /* Scrollbar Styling */
        .modern-calendar-wrapper .fc-scroller::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .modern-calendar-wrapper .fc-scroller::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .modern-calendar-wrapper .fc-scroller::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .modern-calendar-wrapper .fc-scroller::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .modern-calendar-wrapper .fc .fc-toolbar {
            flex-direction: column;
            gap: 1rem;
          }

          .modern-calendar-wrapper .fc .fc-toolbar-title {
            font-size: 1.25rem;
          }

          .modern-calendar-wrapper .fc .fc-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
          }
        }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        weekends={true}
        events={calendarEvents}
        height="auto"
        eventDisplay="block"
        fixedWeekCount={false}
        eventDidMount={(info) => {
          // Apply custom colors based on event background

          // Add special styling for overdue events
          if (info.event.title.includes("(Overdue)")) {
            info.el.style.background =
              "linear-gradient(135deg, #4a3af6ff 0%, #9bb9f2ff 100%)";
            info.el.style.boxShadow = "0 2px 8px rgba(136, 134, 255, 0.25)";
          } else {
            info.el.style.background =
              "linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)";
            info.el.style.boxShadow = "0 2px 8px rgba(147, 197, 253, 0.25)";
          }

          info.el.style.border = "none";
        }}
        eventContent={(arg) => {
          const timeString = arg.event.start
            ? arg.event.start.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "";

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.125rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "black",
              }}
            >
              <div
                style={{
                  whiteSpace: "normal",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                }}
              >
                {arg.event.title}
              </div>
              {timeString && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    opacity: 0.95,
                  }}
                >
                  <Clock size={10} />
                  {timeString}
                </div>
              )}
            </div>
          );
        }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek",
        }}
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
        }}
        dayMaxEvents={3}
        moreLinkText={(num) => `+${num} more`}
      />
    </div>
  );
}

export default StudentCustomCalendar;
