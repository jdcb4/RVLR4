/**
 * Shared roster shape for pass-and-play team setup (WhoWhatWhere + Hat Game UI).
 * Readonly mirrors `TeamSetup` so both games can share the same screen without casts at the boundary.
 */
export type RosterPlayerRow = {
  readonly id: string;
  readonly name: string;
};

export type RosterTeamRow = {
  readonly id: string;
  readonly name: string;
  readonly players: readonly RosterPlayerRow[];
};
