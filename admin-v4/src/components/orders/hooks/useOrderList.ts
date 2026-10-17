import { useCallback, useEffect, useState } from "react";
import { OrderListResult, OrderQuery } from "../types";
import { listOrders } from "../services/orderApi";

/** query 必须是稳定引用（useMemo），变化即重新请求；请求期间保留上一份数据避免闪烁 */
export function useOrderList(query: OrderQuery) {
  const [data, setData] = useState<OrderListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError(null);
    listOrders(query)
      .then((result) => {
        if (!stale) setData(result);
      })
      .catch((err) => {
        if (!stale) setError(err instanceof Error ? err.message : "订单加载失败");
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [query, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { data, loading, error, reload };
}
