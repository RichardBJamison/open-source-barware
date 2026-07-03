"use client";

import { useSyncExternalStore } from "react";

let currentNow = Date.now();

function subscribeToClock(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const update = () => {
    currentNow = Date.now();
    onStoreChange();
  };

  update();
  const intervalId = window.setInterval(update, 60_000);

  return () => {
    window.clearInterval(intervalId);
  };
}

function getNowSnapshot() {
  return currentNow;
}

function getServerNowSnapshot() {
  return 0;
}

export function useLaunchNow() {
  return useSyncExternalStore(
    subscribeToClock,
    getNowSnapshot,
    getServerNowSnapshot,
  );
}
