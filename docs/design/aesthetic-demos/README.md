# RVLRY aesthetic demos

Open `index.html` directly in a browser. No server, build, network connection or
installation is needed. Keep the folder together so the shared script, stylesheet
and bundled fonts remain available.

The four standalone studies are `pub-trivia.html`, `bookclub.html`, `recess.html`
and `observatory.html`. They use the same interactive phone flow: picker, settings,
editable team rosters, review, private handoff, timed play, pause, turn recap and
results. Play supports hints, skips, returning skipped clues and correct answers.
Clues cover Who, What and Where across the three rounds.

Desktop review controls jump to each screen and enable long team/player names.
On a phone, use the **Demo** button for those controls. Direct navigation to recap
or results inserts sample scores. A normal play-through counts the answers you
mark correct. The demos have no persistence and are separate from the Android
application and its production bundle.

Active play keeps the timer, clue, fixed hint slot, bounded histories and 1:2
Skip/Correct controls within a 360 × 640 viewport. Setup and results can scroll
inside the phone while their main action remains visible. Switching tabs pauses
an active turn. Respecting reduced motion removes screen transitions.

The visual worlds use locally bundled Barlow Condensed, Fraunces, Bricolage
Grotesque and Cinzel from Google Fonts. Their SIL Open Font License notices are
included in `assets/`. Bookclub uses a darker terracotta on primary buttons for
readable white labels; the supplied terracotta remains in the clue highlight.

`screenshots/verified/` contains the final 360 × 640 picker/play/results captures
for each world, plus the desktop comparison and review layout.
