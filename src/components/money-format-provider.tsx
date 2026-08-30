"use client";

import { createContext, useContext } from "react";
import { DEFAULT_MONEY_FORMAT, type MoneyFormat } from "@/lib/money";

const MoneyFormatContext = createContext<MoneyFormat>(DEFAULT_MONEY_FORMAT);

/**
 * Hydrated once by the dashboard layout (a server component that reads
 * `getMoneyFormat`). Client components that render money read the configured
 * (currency, locale) from here — RSC and client code cannot share a module
 * singleton, so this context is the client-side half of the bridge.
 */
export function MoneyFormatProvider({
  value,
  children,
}: {
  value: MoneyFormat;
  children: React.ReactNode;
}) {
  return (
    <MoneyFormatContext.Provider value={value}>
      {children}
    </MoneyFormatContext.Provider>
  );
}

export function useMoneyFormat(): MoneyFormat {
  return useContext(MoneyFormatContext);
}
