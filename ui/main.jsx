import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useReducedMotion } from "motion/react";
import TechText from "./TechText";
import Counter from "./Counter";
import "./enhancements.css";

function Title() {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? (
    <span>Project Feedback</span>
  ) : (
    <TechText
      text="Project Feedback"
      fontSize={38}
      fontWeight={650}
      letterSpacing={0}
      color="#25282c"
      accentColor="#286447"
      reveal="letter"
      dashLength={4}
      dashGap={2}
      specks={4}
      labels={false}
      speed={0.75}
    />
  );
}

function DownloadTotal() {
  const [stats, setStats] = useState(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const update = (event) => setStats(event.detail);
    document.addEventListener("project-catalog:stats", update);
    document.dispatchEvent(new Event("project-catalog:request"));
    return () => document.removeEventListener("project-catalog:stats", update);
  }, []);
  const value = stats?.total;
  const available = Number.isSafeInteger(value);
  const formatted = available ? value.toLocaleString("en-US") : "—";
  const length = available ? String(value).length : 1;
  const places = [];
  for (let power = length - 1; power >= 0; power--) {
    places.push(10 ** power);
    if (power > 0 && power % 3 === 0) places.push(",");
  }
  const fresh = stats?.state === "fresh";
  const label =
    stats?.state === "stale"
      ? "Last known total"
      : stats?.state === "cached"
        ? "Saved total · refreshing"
        : fresh
          ? "Latest from Modrinth"
          : "Checking Modrinth";
  return (
    <>
      <p className="downloads-label">Total downloads</p>
      <div
        className="downloads-value"
        data-value={available ? value : ""}
        aria-label={
          available
            ? `${formatted} total downloads`
            : "Total downloads unavailable"
        }
      >
        <span aria-hidden="true">
          {available && !reducedMotion ? (
            <Counter
              value={value}
              places={places}
              fontSize={length > 9 ? 24 : 36}
              gap={0}
              horizontalPadding={0}
              padding={6}
              fontWeight={650}
              gradientHeight={0}
            />
          ) : (
            formatted
          )}
        </span>
      </div>
      <p className="downloads-freshness" data-state={stats?.state || "loading"}>
        <span className="freshness-dot" aria-hidden="true" />
        {label}
        {stats?.checkedAt && (
          <time dateTime={new Date(stats.checkedAt).toISOString()}>
            {new Date(stats.checkedAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </time>
        )}
      </p>
    </>
  );
}

createRoot(document.querySelector("#animated-title")).render(<Title />);
createRoot(document.querySelector("#download-total")).render(<DownloadTotal />);
