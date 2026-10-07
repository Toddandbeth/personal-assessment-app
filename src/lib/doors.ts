// The two front doors of the app. One app, one database; every participant,
// submission and response is tagged with the door it came through.
export type Door = "fullcount" | "intentionalministries";

export const DOOR_FULLCOUNT: Door = "fullcount";
export const DOOR_IM: Door = "intentionalministries";

export function parseDoor(value: unknown): Door {
  return value === DOOR_IM ? DOOR_IM : DOOR_FULLCOUNT;
}

// Where each door's home screen lives (used by "return home" links).
export const HOME_HREF: Record<Door, string> = {
  fullcount: "/fullcount",
  intentionalministries: "/",
};
