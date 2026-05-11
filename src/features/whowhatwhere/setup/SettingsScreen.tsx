import { GamePanel } from "@/components/game/GamePanel";
import { OptionButton, OptionGroup } from "@/components/setup/OptionGroup";
import { TeamCountOptionGroup } from "@/components/setup/TeamCountOptionGroup";
import { toggleCategory } from "@/domain/whowhatwhere/setup";
import {
  CATEGORIES,
  type GameSettings,
  HINT_LIMIT_OPTIONS,
  type HintLimit,
} from "@/domain/whowhatwhere/types";

export function SettingsScreen({
  settings,
  onChange,
  embedded = false,
}: {
  readonly settings: GameSettings;
  readonly onChange: (settings: GameSettings) => void;
  /** When true, omit the inner “Game settings” panel heading (e.g. lobby uses one outer summary). */
  readonly embedded?: boolean;
}) {
  const setSetting = <Key extends keyof GameSettings>(
    key: Key,
    value: GameSettings[Key],
  ) => onChange({ ...settings, [key]: value });

  const controls = (
    <>
      <TeamCountOptionGroup
        value={settings.teamCount}
        onChange={(count) =>
          setSetting("teamCount", count as GameSettings["teamCount"])
        }
      />

      <OptionGroup label="Turn length">
          {[30, 45, 60, 75].map((seconds) => (
            <OptionButton
              key={seconds}
              selected={settings.turnDurationSeconds === seconds}
              onClick={() =>
                setSetting(
                  "turnDurationSeconds",
                  seconds as GameSettings["turnDurationSeconds"],
                )
              }
            >
              {seconds}s
            </OptionButton>
          ))}
        </OptionGroup>

        <OptionGroup label="Rounds">
          {[1, 2, 3, 4].map((rounds) => (
            <OptionButton
              key={rounds}
              selected={settings.totalRounds === rounds}
              onClick={() =>
                setSetting("totalRounds", rounds as GameSettings["totalRounds"])
              }
            >
              {rounds}
            </OptionButton>
          ))}
        </OptionGroup>

        <OptionGroup label="Skips">
          {[
            { label: "1", value: 1 },
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "Any", value: -1 },
          ].map((skip) => (
            <OptionButton
              key={skip.value}
              selected={settings.skipLimit === skip.value}
              onClick={() =>
                setSetting("skipLimit", skip.value as GameSettings["skipLimit"])
              }
            >
              {skip.label}
            </OptionButton>
          ))}
        </OptionGroup>

        <OptionGroup label="Hints per turn">
          {HINT_LIMIT_OPTIONS.map((value) => (
            <OptionButton
              key={value}
              selected={settings.hints.perTurnLimit === value}
              onClick={() =>
                setSetting("hints", {
                  ...settings.hints,
                  perTurnLimit: value as HintLimit,
                  enabled: value > 0,
                })
              }
            >
              {value}
            </OptionButton>
          ))}
        </OptionGroup>

        <OptionGroup label="Categories">
          {CATEGORIES.map((category) => (
            <OptionButton
              key={category}
              selected={settings.selectedCategories.includes(category)}
              onClick={() =>
                setSetting(
                  "selectedCategories",
                  toggleCategory(settings.selectedCategories, category),
                )
              }
            >
              {category}
            </OptionButton>
          ))}
        </OptionGroup>
    </>
  );

  return (
    <section className="keyboard-safe-form flex flex-1 flex-col pb-4">
      {embedded ? (
        <div className="space-y-4">{controls}</div>
      ) : (
        <GamePanel
          subtitle="Choose teams, timing, skips, and which word categories can appear."
          title="Game settings"
        >
          {controls}
        </GamePanel>
      )}
    </section>
  );
}
