'use client';

import { useState, useEffect, useRef } from 'react';

interface ConfirmButtonProps {
  onConfirm: () => void;
  buttonText: string;
  buttonClassName?: string;
  confirmText?: string;
  timeout?: number; // in milliseconds
}

export default function ConfirmButton({
  onConfirm,
  buttonText,
  buttonClassName = 'px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm font-medium shadow-sm',
  confirmText = 'Sure?',
  timeout = 5000, // 5 seconds default
}: ConfirmButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!showConfirm) {
      setProgress(0);
      return;
    }

    startTimeRef.current = Date.now();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / timeout) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    timeoutRef.current = setTimeout(() => {
      setShowConfirm(false);
    }, timeout);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showConfirm, timeout]);

  const handleConfirm = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    onConfirm();
    setShowConfirm(false);
  };

  const handleClick = () => {
    if (showConfirm) {
      handleConfirm();
    } else {
      setShowConfirm(true);
    }
  };

  const circumference = 2 * Math.PI * 8; // radius = 8
  // Invert progress so circle empties as time runs out (showing remaining time)
  const strokeDashoffset = (progress / 100) * circumference;
  const remainingSeconds = Math.ceil((timeout - (progress / 100) * timeout) / 1000);
  const showCountdown = remainingSeconds <= 99;

  return (
    <button onClick={handleClick} className={buttonClassName}>
      <span className="grid items-center justify-center">
        {/* Confirmation State */}
        <span
          className={`col-start-1 row-start-1 flex items-center gap-2 transition-opacity duration-200 ${
            showConfirm ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <span>{confirmText}</span>
          <svg width="20" height="20">
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.3"
            />
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 10 10)"
              className="transition-all duration-75"
            />
            {showCountdown && (
              <text
                x="10"
                y="10"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-bold fill-current"
              >
                {remainingSeconds}
              </text>
            )}
          </svg>
        </span>

        {/* Original State */}
        <span
          className={`col-start-1 row-start-1 transition-opacity duration-200 ${
            showConfirm ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {buttonText}
        </span>
      </span>
    </button>
  );
}
