import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import flagImg from "../assets/flag.png";
import "./HelpPage.css";

const HELP_URL = "https://r.jina.ai/https://codeforces.com/help";

function escapeHtml(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function cleanMarkdown(text = "") {
  return text
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inlineHtml(text = "") {
  return escapeHtml(text)
    .replace(
      /original Codeforces rules/g,
      '<a href="https://codeforces.com/blog/entry/4088" target="_blank" rel="noreferrer">original Codeforces rules</a>'
    )
    .replace(
      /detailed version of the rules/g,
      '<a href="https://codeforces.com/blog/entry/4088" target="_blank" rel="noreferrer">detailed version of the rules</a>'
    )
    .replace(
      /On the technical details on Codeforces/g,
      '<a href="https://codeforces.com/blog/entry/79" target="_blank" rel="noreferrer">On the technical details on Codeforces</a>'
    )
    .replace(
      /read the license/g,
      '<a href="https://codeforces.com/terms" target="_blank" rel="noreferrer">read the license</a>'
    );
}

function stripJinaHeader(text = "") {
  return text
    .replace(/^Title:.*$/m, "")
    .replace(/^URL Source:.*$/m, "")
    .replace(/^Markdown Content:.*$/m, "")
    .replace(/\r/g, "")
    .trim();
}

function isChromeLine(line) {
  const clean = cleanMarkdown(line);

  const exact = new Set([
    "Enter | Register",
    "HOME",
    "TOP",
    "CATALOG",
    "CONTESTS",
    "GYM",
    "PROBLEMSET",
    "GROUPS",
    "RATING",
    "EDU",
    "API",
    "CALENDAR",
    "HELP",
  ]);

  if (!clean || exact.has(clean)) return true;
  if (clean.startsWith("→ Pay attention")) return true;
  if (clean.startsWith("Before contest")) return true;
  if (clean.startsWith("Register now")) return true;
  if (clean.startsWith("→ Streams")) return true;
  if (clean.startsWith("→ Top rated")) return true;
  if (clean.startsWith("→ Top contributors")) return true;
  if (clean.startsWith("→ Find user")) return true;
  if (clean.startsWith("→ Recent actions")) return true;
  if (clean.startsWith("# User Rating")) return true;
  if (clean.startsWith("# User Contrib.")) return true;
  if (/^\d+\s+\S+\s+-?\d+$/.test(clean)) return true;

  return false;
}

function parseNumberedQuestion(line) {
  const clean = cleanMarkdown(line);
  const match = clean.match(/^\d+\.\s+(.+)/);
  return match ? match[1].trim() : "";
}

function parseLiveHelp(text) {
  const lines = stripJinaHeader(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !isChromeLine(line));

  const titleIndex = lines.findIndex(
    (line) => cleanMarkdown(line) === "Frequently Asked Questions"
  );

  const byIndex = lines.findIndex((line) =>
    cleanMarkdown(line).startsWith("By MikeMirzayanov")
  );

  const introIndex = lines.findIndex((line) =>
    cleanMarkdown(line).startsWith(
      "This is the list of frequently asked questions concerning Codeforces work and answers to them."
    )
  );

  const qaIndex = lines.findIndex((line, index) => {
    if (index <= introIndex) return false;
    return /^#+\s*Questions and answers:?$/i.test(line) ||
      cleanMarkdown(line).toLowerCase() === "questions and answers:";
  });

  const fullIndexRaw = lines.findIndex((line) =>
    cleanMarkdown(line).startsWith("Full text and comments")
  );

  const fullIndex = fullIndexRaw === -1 ? lines.length : fullIndexRaw;

  const byLine = byIndex !== -1 ? cleanMarkdown(lines[byIndex]) : "";
  const author = byLine.match(/By\s+([A-Za-z0-9_.-]+)/)?.[1] || "MikeMirzayanov";
  const meta =
    byLine
      .replace(/^By\s+[A-Za-z0-9_.-]+,?\s*/, "")
      .replace(/^,?\s*/, "")
      .trim() || "15 years ago, translation, In English";

  const intro =
    introIndex !== -1
      ? cleanMarkdown(lines[introIndex])
      : "This is the list of frequently asked questions concerning Codeforces work and answers to them.";

  const questionListLines =
    introIndex !== -1 && qaIndex !== -1
      ? lines.slice(introIndex + 1, qaIndex)
      : [];

  const questions = questionListLines
    .map(parseNumberedQuestion)
    .filter(Boolean);

  const answerLines =
    qaIndex !== -1
      ? lines.slice(qaIndex + 1, fullIndex)
      : [];

  const answers = [];
  let current = null;

  answerLines.forEach((line) => {
    const question = parseNumberedQuestion(line);

    if (question) {
      if (current) answers.push(current);
      current = {
        question,
        paragraphs: [],
        bullets: [],
      };
      return;
    }

    if (!current) return;

    const clean = cleanMarkdown(line);
    if (!clean) return;

    if (/^[-*]\s+/.test(line)) {
      current.bullets.push(clean.replace(/^[-*]\s+/, ""));
    } else {
      current.paragraphs.push(clean);
    }
  });

  if (current) answers.push(current);

  return {
    title: titleIndex !== -1 ? cleanMarkdown(lines[titleIndex]) : "Frequently Asked Questions",
    author,
    meta,
    intro,
    questions,
    answers,
    vote: stripJinaHeader(text).match(/Vote:.*?([+-]\d+)/i)?.[1] || "",
    comments: stripJinaHeader(text).match(/Comments\s+(\d+)/i)?.[1] || "",
  };
}

function AnswerItem({ answer, index }) {
  return (
    <li id={`q${index + 1}`}>
      <a className="help-question" href={`#q${index + 1}`}>
        {answer.question}
      </a>

      {answer.paragraphs.map((paragraph) => (
        <p
          key={paragraph}
          dangerouslySetInnerHTML={{ __html: inlineHtml(paragraph) }}
        />
      ))}

      {answer.bullets.length > 0 && (
        <ul className="help-inner-list">
          {answer.bullets.map((bullet) => (
            <li
              key={bullet}
              dangerouslySetInnerHTML={{ __html: inlineHtml(bullet) }}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function HelpPage() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHelp = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(HELP_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      setPage(parseLiveHelp(text));
    } catch (err) {
      setError(`Failed to load help page: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHelp();
  }, [loadHelp]);

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="help-layout">
          <main className="help-main">
            {loading && <div className="help-loading">Loading help...</div>}

            {error && (
              <div className="help-error">
                {error}{" "}
                <button type="button" onClick={loadHelp}>
                  Retry
                </button>
              </div>
            )}

            {page && !loading && !error && (
              <article className="help-article">
                <h1>{page.title}</h1>

                <p className="help-meta">
                  By{" "}
                  <a
                    className="help-author"
                    href={`https://codeforces.com/profile/${page.author}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {page.author}
                  </a>
                  {page.meta ? `, ${page.meta}` : ""}{" "}
                  <img src={flagImg} alt="In English" />
                </p>

                <div className="help-content">
                  <p>{page.intro}</p>

                  <ol className="help-question-list">
                    {page.questions.map((question, index) => (
                      <li key={question}>
                        <a href={`#q${index + 1}`}>{question}</a>
                      </li>
                    ))}
                  </ol>

                  <h2>Questions and answers:</h2>

                  <ol className="help-answer-list">
                    {page.answers.map((answer, index) => (
                      <AnswerItem
                        key={`${answer.question}-${index}`}
                        answer={answer}
                        index={index}
                      />
                    ))}
                  </ol>
                </div>

                <a
                  className="help-full"
                  href="https://codeforces.com/help"
                  target="_blank"
                  rel="noreferrer"
                >
                  Full text and comments &raquo;
                </a>

                <div className="help-tags">
                  Tags <a>codeforces</a>, <a>faq</a>, <a>help</a>
                </div>

                <div className="help-footer">
                  <span>Vote:</span>
                  <button type="button">I like it</button>
                  {page.vote && <span className="help-score">{page.vote}</span>}
                  <button type="button">I do not like it</button>
                  <span className="help-footer-right">
                    Author <a>{page.author}</a>
                    {page.comments && ` Comments ${page.comments}`}
                  </span>
                </div>
              </article>
            )}
          </main>

          <Sidebar />
        </div>
      </div>
    </>
  );
}