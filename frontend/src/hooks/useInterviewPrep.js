/** Hook managing Interview Prep Agent state and SSE lifecycle. */

import { useState, useCallback, useRef, useEffect } from "react";

import { openInterviewPrepStream } from "../api/interviewPrep";

const STATUS = { IDLE: "idle", RUNNING: "running", DONE: "done", ERROR: "error" };

function initialStatus(cachedBriefing) {
  return cachedBriefing ? STATUS.DONE : STATUS.IDLE;
}

export function useInterviewPrep(appId, cachedBriefing = null) {
  const [status, setStatus] = useState(() => initialStatus(cachedBriefing));
  const [progressSteps, setProgressSteps] = useState([]);
  const [briefing, setBriefing] = useState(cachedBriefing);
  const [errorMessage, setErrorMessage] = useState(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus(initialStatus(cachedBriefing));
    setProgressSteps([]);
    setBriefing(cachedBriefing);
    setErrorMessage(null);
  }, [appId, cachedBriefing]);

  const start = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    setStatus(STATUS.RUNNING);
    setProgressSteps([]);
    setBriefing(null);
    setErrorMessage(null);

    esRef.current = openInterviewPrepStream(appId, {
      onProgress: (data) => {
        setProgressSteps((prev) => [...prev, data]);
      },
      onDone: (data) => {
        setBriefing(data.briefing);
        setStatus(STATUS.DONE);
        esRef.current = null;
      },
      onError: (data) => {
        setErrorMessage(data.message ?? "Something went wrong. Please try again.");
        setStatus(STATUS.ERROR);
        esRef.current = null;
      },
    });
  }, [appId]);

  const refresh = useCallback(() => {
    start();
  }, [start]);

  const reset = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus(STATUS.IDLE);
    setProgressSteps([]);
    setBriefing(null);
    setErrorMessage(null);
  }, []);

  return { status, progressSteps, briefing, errorMessage, start, refresh, reset, STATUS };
}
