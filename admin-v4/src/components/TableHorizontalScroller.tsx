/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

interface TableHorizontalScrollerProps {
  /** Target table container with overflow-x-auto */
  targetRef: React.RefObject<HTMLDivElement | null>;
  /** Single click scroll step in px (default: 320) */
  step?: number;
  /** Continuous scroll speed in px per animation frame (default: 14) */
  speed?: number;
  /** Optional custom styling classes */
  className?: string;
  /** Always display controls even if content currently fits (will be disabled) */
  alwaysShow?: boolean;
}

export function TableHorizontalScroller({
  targetRef,
  step = 320,
  speed = 14,
  className,
  alwaysShow = false
}: TableHorizontalScrollerProps) {
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const holdTimerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);

  // Check horizontal scroll limits
  const updateScrollState = useCallback(() => {
    const el = targetRef.current;
    if (!el) {
      setHasOverflow(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const overflow = el.scrollWidth > el.clientWidth + 6;
    setHasOverflow(overflow);
    if (!overflow) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, [targetRef]);

  // Stop any ongoing continuous scroll
  const stopScroll = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (animFrameRef.current !== null) {
      window.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isHoldingRef.current = false;
  }, []);

  // Continuous scrolling loop via requestAnimationFrame
  const startContinuousScroll = useCallback((direction: 1 | -1) => {
    const loop = () => {
      const el = targetRef.current;
      if (!el) {
        stopScroll();
        return;
      }
      el.scrollLeft += direction * speed;
      updateScrollState();

      // Check boundary to stop loop
      if (direction === -1 && el.scrollLeft <= 2) {
        stopScroll();
        return;
      }
      if (direction === 1 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        stopScroll();
        return;
      }

      animFrameRef.current = window.requestAnimationFrame(loop);
    };
    animFrameRef.current = window.requestAnimationFrame(loop);
  }, [targetRef, speed, updateScrollState, stopScroll]);

  // Handle pointer down (click vs long press)
  const handleStart = (direction: 1 | -1, e: React.MouseEvent | React.TouchEvent) => {
    if ("button" in e && e.button !== 0) return; // Only left mouse click
    e.preventDefault();

    stopScroll();
    isHoldingRef.current = false;

    // Trigger immediate single step for quick clicks
    const el = targetRef.current;
    if (el) {
      el.scrollBy({ left: direction * step, behavior: "smooth" });
      updateScrollState();
    }

    // Set hold timer for continuous scrolling after 180ms
    holdTimerRef.current = window.setTimeout(() => {
      isHoldingRef.current = true;
      startContinuousScroll(direction);
    }, 180);
  };

  // Monitor target element horizontal scroll and size changes
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    updateScrollState();

    const handleTargetScroll = () => {
      updateScrollState();
    };

    el.addEventListener("scroll", handleTargetScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", handleTargetScroll);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [targetRef, updateScrollState]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => stopScroll();
  }, [stopScroll]);

  if (!hasOverflow && !alwaysShow) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-slate-200/90 bg-white p-0.5 shadow-2xs select-none",
        className
      )}
      title="表格横向滚动（点击单步 / 长按平滑）"
    >
      <button
        type="button"
        disabled={!canScrollLeft}
        onMouseDown={(e) => handleStart(-1, e)}
        onMouseUp={stopScroll}
        onMouseLeave={stopScroll}
        onTouchStart={(e) => handleStart(-1, e)}
        onTouchEnd={stopScroll}
        onTouchCancel={stopScroll}
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center transition-all",
          canScrollLeft
            ? "text-slate-700 hover:bg-slate-100 hover:text-brand-600 active:scale-95 cursor-pointer"
            : "text-slate-300 cursor-not-allowed opacity-45"
        )}
        aria-label="向左滚动"
        title="向左滚动表格（点击单步 / 长按平滑）"
      >
        <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
      </button>

      <div className="w-px h-3.5 bg-slate-200" />

      <button
        type="button"
        disabled={!canScrollRight}
        onMouseDown={(e) => handleStart(1, e)}
        onMouseUp={stopScroll}
        onMouseLeave={stopScroll}
        onTouchStart={(e) => handleStart(1, e)}
        onTouchEnd={stopScroll}
        onTouchCancel={stopScroll}
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center transition-all",
          canScrollRight
            ? "text-slate-700 hover:bg-slate-100 hover:text-brand-600 active:scale-95 cursor-pointer"
            : "text-slate-300 cursor-not-allowed opacity-45"
        )}
        aria-label="向右滚动"
        title="向右滚动表格（点击单步 / 长按平滑）"
      >
        <ChevronRight className="w-4 h-4 stroke-[2.2]" />
      </button>
    </div>
  );
}
