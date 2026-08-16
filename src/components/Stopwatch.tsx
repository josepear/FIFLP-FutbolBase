// ============================================================
// Componente de cronómetro visual
// ============================================================

import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import { useStopwatch } from '../hooks/useStopwatch';

interface Props {
  onTimeRecorded?: (timeMs: number) => void;
  compact?: boolean;
}

export function Stopwatch({ onTimeRecorded, compact = false }: Props) {
  const { isRunning, elapsed, splits, start, stop, split, reset, formattedTime } = useStopwatch();

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-2' : 'gap-4'}`}>
      {/* Display */}
      <div className={`font-mono font-bold tabular-nums text-primary ${compact ? 'text-3xl' : 'text-6xl'}`}>
        {formattedTime()}
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        {!isRunning ? (
          <button
            onClick={start}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-full px-6 py-3 font-semibold text-lg transition-colors"
          >
            <Play size={24} /> {elapsed === 0 ? 'Iniciar' : 'Reanudar'}
          </button>
        ) : (
          <>
            <button
              onClick={split}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full px-4 py-3 font-semibold transition-colors"
            >
              <Flag size={20} /> Parcial
            </button>
            <button
              onClick={stop}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full px-6 py-3 font-semibold text-lg transition-colors"
            >
              <Pause size={24} /> Parar
            </button>
          </>
        )}
        {elapsed > 0 && !isRunning && (
          <>
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-full px-4 py-3 font-semibold transition-colors"
            >
              <RotateCcw size={20} /> Reset
            </button>
            {onTimeRecorded && (
              <button
                onClick={() => onTimeRecorded(elapsed)}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-3 font-semibold transition-colors"
              >
                ✓ Registrar {formattedTime()}
              </button>
            )}
          </>
        )}
      </div>

      {/* Splits / parciales */}
      {splits.length > 0 && (
        <div className="w-full max-h-32 overflow-y-auto bg-muted rounded-lg p-2">
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Parciales</h4>
          {splits.map((s, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-600 py-0.5">
              <span>#{i + 1}</span>
              <span className="font-mono">
                {String(Math.floor(s / 60000)).padStart(2, '0')}:
                {String(Math.floor((s % 60000) / 1000)).padStart(2, '0')}.
                {String(Math.floor((s % 1000) / 10)).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
