# Phone screens

The offline picker opens independent game sessions. Saved-session choice is inside each game, with resume, saved date/time and confirmed replacement. Header Home saves/leaves or first covers an active game; native Back is handled by the game before route navigation.

Who What Where: settings → per-team roster → review → named handoff → timed turn → word recap → round standings where appropriate → results. The paused cover hides words and preserves time. Settings/roster and scored turns persist independently of component lifetime.

Hat: settings → per-team roster → review → private figure entry for every player → named handoff → timed turn → recap → next team/results. Describe, One Word and Charades are phases of the same shared deck; a phase may change during a turn without restarting the clock.

Imposter: settings → roster → review → individual concealed/revealed roles → twice-around clues → discussion → final-reveal confirmation → results. Background/Back covers private roles; returning re-reveals the same player's assigned role. Voting happens socially; there is no in-app vote, elimination or timer.

GameShell supplies compact header, safe-area body and fixed footer. DeviceTeamSetup/Review supply shared roster presentation; each game binds its own mutations. Device controllers own persistence and rules; React pages own dialogs and presentation only. Lucide is the standard control icon set; custom SVG identities distinguish games.

Aim for one screen at default phone text size; preserve scroll access with keyboard, large text or long content rather than shrinking controls. Live word columns scroll internally with +N others cues. No duplicate instructional prose, no player names inside compact numbered team cards, no layout shift when hints reveal.

Aesthetic demos are isolated under docs/design/aesthetic-demos and are not runtime screen specifications.
