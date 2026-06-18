import "./CodeforcesFooter.css";

export default function CodeforcesFooter() {
  const now = new Date();

  const serverTime = now.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <footer className="cf-footer">
      <div className="cf-footer-line" />
      <div className="cf-footer-text">
        <a href="https://codeforces.com" target="_blank" rel="noreferrer">
          Codeforces
        </a>{" "}
        (c) Copyright 2010-2026 Mike Mirzayanov
        <br />
        The only programming contests Web 2.0 platform
        <br />
        Server time: {serverTime} (k3).
        <br />
        Desktop version, switch to{" "}
        <a href="https://m1.codeforces.com" target="_blank" rel="noreferrer">
          mobile version
        </a>
        .
        <br />
        <a href="https://codeforces.com/privacy" target="_blank" rel="noreferrer">
          Privacy Policy
        </a>{" "}
        |{" "}
        <a href="https://codeforces.com/terms" target="_blank" rel="noreferrer">
          Terms and Conditions
        </a>
        <div className="cf-supported">Supported by</div>
        <a
          className="cf-ton"
          href="https://ton.org"
          target="_blank"
          rel="noreferrer"
          aria-label="TON"
        >
          <span />
        </a>
      </div>
    </footer>
  );
}