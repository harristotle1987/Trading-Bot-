import useSWR, { mutate } from 'swr';
import React, { useRef } from 'react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
};

export function useLiveTrades() {
  const prevDataRef = useRef<any[]>([]);

  const { data, error, mutate, isValidating } = useSWR('/api/trades/active', fetcher, {
    refreshInterval: 2500,
    dedupingInterval: 1000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const stableData = React.useMemo(() => {
    if (!data) return prevDataRef.current;
    if (JSON.stringify(prevDataRef.current) === JSON.stringify(data)) {
      return prevDataRef.current;
    }
    prevDataRef.current = data;
    return data;
  }, [data]);

  return {
    activeTrades: stableData || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
    isValidating
  };
}

export function useClosedTrades() {
  const prevDataRef = useRef<any[]>([]);

  const { data, error, mutate, isValidating } = useSWR('/api/trades/closed', fetcher, {
    refreshInterval: 5000,
    dedupingInterval: 2000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const stableData = React.useMemo(() => {
    if (!data) return prevDataRef.current;
    if (JSON.stringify(prevDataRef.current) === JSON.stringify(data)) {
      return prevDataRef.current;
    }
    prevDataRef.current = data;
    return data;
  }, [data]);

  return {
    closedTrades: stableData || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
    isValidating
  };
}

export function useAccountBalance() {
  const prevBalancesRef = useRef<any>(null);

  const { data, error, mutate, isValidating } = useSWR('/api/account/balances', fetcher, {
    refreshInterval: 4000,
    dedupingInterval: 2000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const stableBalances = React.useMemo(() => {
    if (!data) return prevBalancesRef.current;
    if (JSON.stringify(prevBalancesRef.current) === JSON.stringify(data)) {
      return prevBalancesRef.current;
    }
    prevBalancesRef.current = data;
    return data;
  }, [data]);

  return {
    balances: stableBalances || {
      demo: { total_equity: 10000.0, available_balance: 10000.0, currency: "USDT", status: "ONLINE" },
      live: { total_equity: 0.0, available_balance: 0.0, currency: "USDT", status: "OFFLINE" },
    },
    isLoading: !error && !data,
    isError: error,
    mutate,
    isValidating
  };
}

