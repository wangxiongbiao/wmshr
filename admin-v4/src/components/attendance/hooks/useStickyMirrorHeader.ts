import { useState, useRef, useEffect, useCallback } from "react";

export function useStickyMirrorHeader(dependencyKeys: any[] = []) {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const mirrorHeaderRef = useRef<HTMLDivElement | null>(null);
  const realTableRef = useRef<HTMLTableElement | null>(null);
  const realTheadRef = useRef<HTMLTableSectionElement | null>(null);
  const tableHeadSentinelRef = useRef<HTMLDivElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement | null>(null);

  const [isMirrorHeaderVisible, setIsMirrorHeaderVisible] = useState(false);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [realTableWidth, setRealTableWidth] = useState<number>(0);

  // 测量真实表头各列像素宽度与表格总宽度
  const updateColWidths = useCallback(() => {
    if (!realTheadRef.current || !realTableRef.current) return;
    const thElements = realTheadRef.current.querySelectorAll("th");
    if (thElements.length > 0) {
      const widths = Array.from(thElements).map((th) => (th as HTMLElement).getBoundingClientRect().width);
      setColWidths(widths);
      setRealTableWidth(realTableRef.current.getBoundingClientRect().width);
    }
  }, []);

  useEffect(() => {
    updateColWidths();
    window.addEventListener("resize", updateColWidths);
    return () => window.removeEventListener("resize", updateColWidths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateColWidths, ...dependencyKeys]);

  // 横向滚动同步：真实表格容器滚动时，实时将 scrollLeft 赋给悬浮镜像表头
  const handleTableScroll = useCallback(() => {
    if (tableContainerRef.current && mirrorHeaderRef.current) {
      mirrorHeaderRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    if (isMirrorHeaderVisible && tableContainerRef.current && mirrorHeaderRef.current) {
      mirrorHeaderRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }, [isMirrorHeaderVisible]);

  // 监听长页面纵向滚动，当真实表头滑动至吸顶操作栏下方时，动态浮现镜像表头
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
    handleTableScroll
  };
}
