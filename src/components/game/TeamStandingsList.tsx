export type TeamStanding = {
  readonly id: string;
  readonly name: string;
  readonly score: number;
};

export function TeamStandingsList({ teams }: { readonly teams: readonly TeamStanding[] }) {
  return (
    <ul className="mt-2 space-y-1 text-typ-ui text-muted-foreground">
      {teams.map((team) => (
        <li className="flex justify-between gap-2" key={team.id}>
          <span>{team.name}</span>
          <span className="font-semibold text-foreground">{team.score}</span>
        </li>
      ))}
    </ul>
  );
}
