/** Hook managing Interview Prep Agent state and SSE lifecycle. */

import { useState, useCallback, useRef, useEffect } from "react";

import { openInterviewPrepStream } from "../api/interviewPrep";

const STATUS = { IDLE: "idle", RUNNING: "running", DONE: "done", ERROR: "error" };

function initialStatus(cachedBriefing, serverStatus) {
  if (cachedBriefing) return STATUS.DONE;
  if (serverStatus === "generating") return STATUS.RUNNING;
  if (serverStatus === "failed") return STATUS.ERROR;
  return STATUS.IDLE;
}

export function useInterviewPrep(appId, cachedBriefing = null, serverStatus = null) {
  const [status, setStatus] = useState(() => initialStatus(cachedBriefing, serverStatus));
  const [progressSteps, setProgressSteps] = useState([]);
  const [briefing, setBriefing] = useState(cachedBriefing);
  const [errorMessage, setErrorMessage] = useState(
    () => (serverStatus === "failed" ? "Interview prep failed. Please try again." : null),
  );
  const esRef = useRef(null);

  useEffect(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus(initialStatus(cachedBriefing, serverStatus));
    setProgressSteps([]);
    setBriefing(cachedBriefing);
    setErrorMessage(serverStatus === "failed" ? "Interview prep failed. Please try again." : null);
  }, [appId, cachedBriefing, serverStatus]);

  const start = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
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
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
      },
      onError: (data) => {
        setErrorMessage(data.message ?? "Something went wrong. Please try again.");
        setStatus(STATUS.ERROR);
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
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

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  return { status, progressSteps, briefing, errorMessage, start, refresh, reset, STATUS };
}
