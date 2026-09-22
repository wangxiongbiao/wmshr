import { useRef, useState, useCallback, useEffect, type RefObject } from "react";

export interface UseStickyMirrorHeaderOptions {
  tableContainerRef?: RefObject<HTMLDivElement | null>;
  deps?: any[];
}

export function useStickyMirrorHeader(options: UseStickyMirrorHeaderOptions = {}) {
  const localTableContainerRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = options.tableContainerRef || localTableContainerRef;

  const mirrorHeaderRef = useRef<HTMLDivElement | null>(null);
  const realTableRef = useRef<HTMLTableElement | null>(null);
  const realTheadRef = useRef<HTMLTableSectionElement | null>(null);
  const tableHeadSentinelRef = useRef<HTMLDivElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement | null>(null);

  const [isMirrorHeaderVisible, setIsMirrorHeaderVisible] = useState(false);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [realTableWidth, setRealTableWidth] = useState<number>(0);

  const updateColWidths = useCallback(() => {
    if (!realTheadRef.current || !realTableRef.current) return;
    const thElements = realTheadRef.current.querySelectorAll("th");
    if (thElements.length > 0) {
      const widths = Array.from(thElements).map((th) => th.getBoundingClientRect().width);
      setColWidths(widths);
      setRealTableWidth(realTableRef.current.getBoundingClientRect().width);
    }
  }, []);

  const handleTableScroll = useCallback(() => {
    if (tableContainerRef.current && mirrorHeaderRef.current) {
      mirrorHeaderRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }, [tableContainerRef]);

  useEffect(() => {
    if (isMirrorHeaderVisible && tableContainerRef.current && mirrorHeaderRef.current) {
      mirrorHeaderRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }, [isMirrorHeaderVisible, tableContainerRef]);

  const deps = options.deps || [];
  useEffect(() => {
    updateColWidths();
    window.addEventListener("resize", updateColWidths);
    return () => window.removeEventListener("resize", updateColWidths);
  }, [updateColWidths, ...deps]);

  useEffect(() => {
    const sentinel = tableHeadSentinelRef.current;
    if (!sentinel) return;

    let scrollParent: HTMLElement | null = sentinel.parentElement;
    while (scrollParent && scrollParent !== document.body) {
      const overflowY = window.getComputedStyle(scrollParent).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }

    const target = scrollParent || window;
    const handleScroll = () => {
      if (!sentinel) return;
      const rect = sentinel.getBoundingClientRect();
      const threshold = actionBarRef.current
        ? actionBarRef.current.getBoundingClientRect().bottom
        : 75;
      const tableBottom = realTableRef.current
        ? realTableRef.current.getBoundingClientRect().bottom
        : Infinity;
      const shouldShow = rect.top <= threshold && tableBottom > threshold;
      if (shouldShow) {
        updateColWidths();
      }
      setIsMirrorHeaderVisible(shouldShow);
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      target.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateColWidths]);

  return {
    tableContainerRef,
    mirrorHeaderRef,
    realTableRef,
    realTheadRef,
    tableHeadSentinelRef,
    actionBarRef,
    isMirrorHeaderVisible,
    colWidths,
    realTableWidth,
    updateColWidths,
    handleTableScroll,
  };
}
