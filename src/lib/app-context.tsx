import { createContext, useContext, type ReactNode } from "react";
import type { MyContext } from "./types";

const AppContext = createContext<MyContext | null>(null);

export function AppContextProvider({ value, children }: { value: MyContext; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("App context is unavailable");
  return value;
}
