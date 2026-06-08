import Navbar from "../components/Navbar";
import "./CalendarPage.css";

// This is the exact Google Calendar embed CF uses
const GCAL_SRC =
  "https://calendar.google.com/calendar/embed?" +
  "src=Vc3g5MWlkZXMuamlsZS5jb20%40gmail.com" +
  "&src=p51fkv5a35kscnjdk09gcbr1ko%40group.calendar.google.com" +
  "&ctz=Asia%2FKolkata" +
  "&mode=MONTH" +
  "&showTitle=0" +
  "&showNav=1" +
  "&showDate=1" +
  "&showPrint=1" +
  "&showTabs=0" +
  "&showCalendars=0" +
  "&showTz=1" +
  "&height=600" +
  "&wkst=1" +
  "&bgcolor=%23FFFFFF" +
  "&color=%23a32929" +
  "&hl=en";

export default function CalendarPage() {
  return (
    <>
      <Navbar />
      <div className="cal-page">
        <h2 className="cal-title">Calendar</h2>

        <div className="cal-iframe-wrap">
          <iframe
            src={GCAL_SRC}
            width="100%"
            height="600"
            frameBorder="0"
            scrolling="no"
            title="Programming Contests Calendar"
            className="cal-iframe"
          />

          <div className="cal-footer">
            <div className="cal-footer-left">
              <div className="cal-footer-title">Programming Contests Calendar</div>
              <div className="cal-footer-sub">
                Events shown in time zone: (GMT+05:30) India Standard Time - Kolkata
              </div>
              <a
                href="https://calendar.google.com/calendar/r?cid=p51fkv5a35kscnjdk09gcbr1ko%40group.calendar.google.com"
                target="_blank"
                rel="noreferrer"
                className="cal-add-link"
              >
                Add to Google Calendar
              </a>
            </div>
            <div className="cal-footer-right">
              <a href="https://calendar.google.com" target="_blank" rel="noreferrer">
                <span style={{ color: "#4285F4", fontWeight: "bold", fontSize: 13 }}>G</span>
                <span style={{ color: "#EA4335", fontWeight: "bold", fontSize: 13 }}>o</span>
                <span style={{ color: "#FBBC05", fontWeight: "bold", fontSize: 13 }}>o</span>
                <span style={{ color: "#4285F4", fontWeight: "bold", fontSize: 13 }}>g</span>
                <span style={{ color: "#34A853", fontWeight: "bold", fontSize: 13 }}>l</span>
                <span style={{ color: "#EA4335", fontWeight: "bold", fontSize: 13 }}>e</span>
                <span style={{ fontSize: 13, color: "#555" }}> Calendar</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
