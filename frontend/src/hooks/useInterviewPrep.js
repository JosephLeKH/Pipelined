/** Hook managing Interview Prep Agent state and SSE lifecycle. */

import { useState, useCallback, useRef } from "react";

import { openInterviewPrepStream } from "../api/interviewPrep";

const STATUS = { IDLE: "idle", RUNNING: "running", DONE: "done", ERROR: "error" };

export function useInterviewPrep(appId) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [progressSteps, setProgressSteps] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const esRef = useRef(null);

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

  return { status, progressSteps, briefing, errorMessage, start, reset, STATUS };
}
