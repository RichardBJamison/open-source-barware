import { useSyncExternalStore } from "react";

export function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}