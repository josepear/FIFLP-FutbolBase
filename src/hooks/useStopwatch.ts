// ============================================================
// Hook de cronómetro para pruebas cronometradas
// ============================================================

import { useState, useRef, useCallback } from 'react';

export function useStopwatch() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [splits, setSplits] = useState<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = Date.now() - elapsed;
    setIsRunning(true);
    intervalRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 50); // Actualiza cada 50ms para suavidad
  }, [isRunning, elapsed]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
  }, [isRunning]);

  const split = useCallback(() => {
    if (!isRunning) return;
    setSplits(prev => [...prev, elapsed]);
  }, [isRunning, elapsed]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setElapsed(0);
    setSplits([]);
  }, []);

  const restart = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSplits([]);
    setElapsed(0);
    startTimeRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 50);
  }, []);

  const formattedTime = useCallback(() => {
    const totalMs = elapsed;
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const ms = Math.floor((totalMs % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }, [elapsed]);

  return { isRunning, elapsed, splits, start, stop, split, reset, restart, formattedTime };
}
