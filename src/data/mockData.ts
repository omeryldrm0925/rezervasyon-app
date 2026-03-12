import { type Area, type OverridesByDate, type Reservation, type Table } from "../types";

function masa(base: Table): Table {
  return base;
}

export const mockAreas: Area[] = [
  {
    id: "alan-salon",
    name: "Salon",
    defaultTables: [
      masa({
        id: "sl-t1",
        label: "M1",
        shape: "square",
        x: 140,
        y: 140,
        width: 84,
        height: 84,
        capacity: 4
      }),
      masa({
        id: "sl-t2",
        label: "M2",
        shape: "round",
        x: 300,
        y: 140,
        width: 92,
        height: 92,
        capacity: 4
      }),
      masa({
        id: "sl-t3",
        label: "M3",
        shape: "rectangle",
        x: 480,
        y: 140,
        width: 132,
        height: 80,
        capacity: 6
      })
    ],
    defaultFixtures: [
      { id: "sl-kapi-1", kind: "door", x: 44, y: 258, width: 56, height: 16, rotation: 90, label: "Giriş" },
      { id: "sl-pencere-1", kind: "window", x: 650, y: 84, width: 110, height: 14, rotation: 0, label: "Pencere" }
    ]
  }
];

export const mockOverrides: OverridesByDate = {};

export const mockReservations: Reservation[] = [];
