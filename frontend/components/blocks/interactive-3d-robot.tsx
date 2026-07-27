'use client';

import { Suspense, lazy } from 'react';
const Spline = lazy(() => import('@splinetool/react-spline'));

interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
}

export function InteractiveRobotSpline({ scene, className }: InteractiveRobotSplineProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <div
          className="absolute"
          style={{ width: "160%", height: "200%", top: "-15%", left: "-45%" }}
        >
          <Spline scene={scene} style={{ width: "100%", height: "100%" }} />
        </div>
      </Suspense>
    </div>
  );
}