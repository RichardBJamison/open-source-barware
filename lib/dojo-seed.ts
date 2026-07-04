import type {
  Bar,
  Bottle,
  InventoryCount,
  InventorySettings,
  WeeklyInputDraft,
} from "@/lib/inventory-store";

function bottle(
  id: string,
  name: string,
  category: string,
  currentLevel: number,
  parLevel: number,
  costPerBottle: number,
  size = "750ml"
): Bottle {
  return { id, name, category, currentLevel, parLevel, size, costPerBottle };
}

export const DOJO_BAR_NAME = "Agave & Rye";

export function createDojoBar(): Bar {
  const now = new Date().toISOString();
  const lastCount = new Date();
  lastCount.setDate(lastCount.getDate() - 4);

  return {
    id: "dojo-bar-agave-rye",
    name: DOJO_BAR_NAME,
    lastCountDate: lastCount.toISOString(),
    createdAt: now,
    updatedAt: now,
    stations: [
      {
        id: "dojo-well-main",
        name: "Main Well",
        type: "well",
        bottles: [
          bottle("w1", "Well Vodka", "vodka", 2.4, 3, 18),
          bottle("w2", "Well Gin", "gin", 1.8, 2.5, 16),
          bottle("w3", "Well Rum", "rum", 3.1, 3, 15),
          bottle("w4", "Well Tequila", "tequila", 2.2, 3, 17),
          bottle("w5", "Well Bourbon", "bourbon", 1.6, 2.5, 19),
        ],
      },
      {
        id: "dojo-back-bar",
        name: "Back Bar Main",
        type: "back-bar",
        bottles: [
          bottle("b1", "Buffalo Trace", "bourbon", 3.7, 4, 28),
          bottle("b2", "Grey Goose", "vodka", 1.2, 3, 42, "1.75L"),
          bottle("b3", "Casamigos Blanco", "tequila", 2.5, 3, 44),
          bottle("b4", "Hendrick's Gin", "gin", 0.8, 2, 36),
          bottle("b5", "Don Julio Reposado", "tequila", 1.9, 2, 52),
          bottle("b6", "Bulleit Rye", "whiskey", 2.3, 3, 32),
        ],
      },
      {
        id: "dojo-service",
        name: "Service Bar",
        type: "service",
        bottles: [
          bottle("s1", "Bacardi Superior", "rum", 4.1, 3, 22, "1.75L"),
          bottle("s2", "Tito's Handmade", "vodka", 2.8, 3, 26),
          bottle("s3", "Jameson", "whiskey", 1.4, 2, 30),
          bottle("s4", "Aperol", "liqueur", 0.9, 1.5, 24),
        ],
      },
      {
        id: "dojo-walk-in",
        name: "Walk-in Cooler",
        type: "walk-in",
        bottles: [
          bottle("c1", "Modelo Especial", "beer", 18, 24, 28, "case"),
          bottle("c2", "Bud Light", "beer", 12, 18, 22, "case"),
          bottle("c3", "Blue Moon", "beer", 8, 12, 32, "keg"),
          bottle("c4", "House IPA Rotation", "beer", 1, 2, 95, "keg"),
        ],
      },
      {
        id: "dojo-wine",
        name: "Wine Rack",
        type: "wine",
        bottles: [
          bottle("v1", "House Pinot Grigio", "wine", 6, 8, 9),
          bottle("v2", "Caymus Cabernet", "wine", 2.5, 4, 68),
          bottle("v3", "Prosecco Split", "wine", 14, 18, 7, "187ml"),
          bottle("v4", "Malbec Reserve", "wine", 3.2, 4, 22),
        ],
      },
    ],
  };
}

export function createDojoCounts(bar: Bar): InventoryCount[] {
  const entries = bar.stations
    .flatMap((station) =>
      station.bottles.map((bottleItem) => ({
        bottleId: bottleItem.id,
        bottleName: bottleItem.name,
        stationId: station.id,
        previousLevel: Math.min(bottleItem.currentLevel + 0.4, 10),
        countedLevel: bottleItem.currentLevel,
      }))
    )
    .slice(0, 12);

  const older = new Date();
  older.setDate(older.getDate() - 11);

  const recent = new Date();
  recent.setDate(recent.getDate() - 4);

  return [
    {
      id: "dojo-count-recent",
      date: recent.toISOString(),
      notes: "Friday close — well and back bar walked before shift change.",
      createdBy: "Dojo sandbox",
      entries,
    },
    {
      id: "dojo-count-older",
      date: older.toISOString(),
      notes: "Week opener after delivery. Beer cooler restocked.",
      createdBy: "Dojo sandbox",
      entries: entries.map((entry) => ({
        ...entry,
        previousLevel: entry.countedLevel + 0.6,
        countedLevel: entry.countedLevel + 0.3,
      })),
    },
  ];
}

export function createDojoSettings(): InventorySettings {
  return {
    aiProvider: "claude",
    apiConnectionStatus: "needs-key",
    cycleLabel: "Weekly beverage inventory",
    weekStartsOn: "Monday",
    backupReminderAccepted: true,
    showOpenBottleTenths: true,
    notes:
      "Dojo sandbox — connect your own API key when you download the real program.",
    updatedAt: new Date().toISOString(),
  };
}

export function createDojoWeeklyInputs(): WeeklyInputDraft {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    countNotes:
      "Well low on Hendrick's. Grey Goose moved faster than last week. Walk-in beer counts match delivery ticket.",
    invoiceNotes:
      "Southern Glazer's 6/28 — spirits restock. Breakthru 6/29 — draft and package beer.",
    posNotes: "Toast export attached for liquor, beer, and wine categories.",
    invoiceFiles: [
      {
        id: "dojo-invoice-1",
        name: "southern-glazers-0628.pdf",
        size: 248000,
        type: "application/pdf",
        lastModified: Date.now(),
        addedAt: new Date().toISOString(),
      },
    ],
    posFiles: [
      {
        id: "dojo-pos-1",
        name: "toast-sales-week-23.csv",
        size: 52000,
        type: "text/csv",
        lastModified: Date.now(),
        addedAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}