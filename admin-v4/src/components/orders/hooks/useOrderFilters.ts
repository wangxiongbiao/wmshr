import { useEffect, useMemo, useState } from "react";
import { OrderQuery, OrderTabStatus, PlatformFilter } from "../types";
import { ORDER_PAGE_SIZE } from "../constants";

const KEYWORD_DEBOUNCE_MS = 300;

export function useOrderFilters() {
  const [activeTab, setActiveTab] = useState<OrderTabStatus>("pending_print");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [customerId, setCustomerId] = useState("all");
  const [shopId, setShopId] = useState("all");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, KEYWORD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keyword]);

  const resetPageThen = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const query = useMemo<OrderQuery>(
    () => ({
      status: activeTab,
      keyword: debouncedKeyword,
      customerId,
      shopId,
      platform,
      dateFrom,
      dateTo,
      page,
      pageSize: ORDER_PAGE_SIZE,
    }),
    [activeTab, debouncedKeyword, customerId, shopId, platform, dateFrom, dateTo, page]
  );

  const hasActiveFilters =
    keyword !== "" || customerId !== "all" || shopId !== "all" || platform !== "all" || dateFrom !== "" || dateTo !== "";

  const resetFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setCustomerId("all");
    setShopId("all");
    setPlatform("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return {
    query,
    keyword,
    setKeyword,
    activeTab,
    setActiveTab: resetPageThen(setActiveTab),
    customerId,
    setCustomerId: (value: string) => {
      setCustomerId(value);
      setShopId("all");
      setPage(1);
    },
    shopId,
    setShopId: resetPageThen(setShopId),
    platform,
    setPlatform: resetPageThen(setPlatform),
    dateFrom,
    setDateFrom: resetPageThen(setDateFrom),
    dateTo,
    setDateTo: resetPageThen(setDateTo),
    page,
    setPage,
    hasActiveFilters,
    resetFilters,
  };
}
