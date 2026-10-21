const worlds = {
  "pub-trivia": {
    name: "Pub Trivia",
    line: "A warm table. A quick mind.",
    description:
      "Chalkboard contrast, amber buttons and a paper clue ticket. The familiar rhythm of a pub quiz.",
  },
  bookclub: {
    name: "Bookclub",
    line: "Good company. Great guesses.",
    description:
      "Editorial serif type, parchment, sage and terracotta. Quiet structure with a generous reading rhythm.",
  },
  recess: {
    name: "Recess",
    line: "Let the good guesses roll.",
    description:
      "Cobalt, cut paper, chunky type and hard shadows. A bright, tactile game-night energy.",
  },
  observatory: {
    name: "Observatory",
    line: "A little friendly discovery.",
    description:
      "Engraved lettering, brass rules and constellations against indigo. A calm, atmospheric night.",
  },
};
const theme = document.body.dataset.theme || "pub-trivia";
const world = worlds[theme];
const icons = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  skip: '<path d="m5 5 10 7-10 7ZM19 5v14"/>',
  return: '<path d="M9 7 4 12l5 5M4 12h10a5 5 0 0 1 0 10"/>',
  phone:
    '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2m-9-9-3 3 3 3m16-6 3 3-3 3"/>',
  trophy:
    '<path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 0h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bulb: '<path d="M9 18h6m-5 3h4m-6-7a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/>',
  stars: '<path d="m9 2 2 6 6 2-6 2-2 6-2-6-6-2 6-2Zm10 12 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/>',
};
const svg = (name, extra = "") =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${icons[name]}</svg>`;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
const stages = [
  ["picker", "Picker"],
  ["settings", "Settings"],
  ["teams", "Teams"],
  ["review", "Review"],
  ["ready", "Handoff"],
  ["play", "Play"],
  ["pause", "Pause"],
  ["recap", "Recap"],
  ["results", "Results"],
];
const defaults = [
  ["The Night Owls", "Alex", "Charlie"],
  ["Great Minds", "Sam", "Robin"],
  ["Wild Cards", "Taylor", "Morgan"],
  ["Lucky Guesses", "Jordan", "Casey"],
];
const longs = [
  ["The Extraordinarily Clever Crew", "Alexandra Montgomery", "Christopher-James Bell"],
  ["The Unreasonably Good Guessers", "Samantha Penelope West", "Robin Maximilian Jones"],
  ["A Very Competitive Book Club", "Taylor Anastasios Wright", "Morgan Elizabeth Lee"],
  ["The Last-Minute Masterminds", "Jordan Theodore Walker", "Casey Clementine Smith"],
];
const words = [
  ["David Attenborough", "A British broadcaster known for nature documentaries."],
  ["Frida Kahlo", "A Mexican artist famous for self-portraits."],
  ["Paddington Bear", "A bear from Peru who loves marmalade."],
  ["Serena Williams", "An American tennis champion."],
  ["Sherlock Holmes", "A fictional detective who lives on Baker Street."],
  ["Dolly Parton", "A singer and songwriter from Tennessee."],
  ["Albert Einstein", "A physicist known for the theory of relativity."],
  ["Beyoncé", "A singer who released Lemonade."],
  ["Keanu Reeves", "An actor who plays Neo and John Wick."],
  ["Wednesday Addams", "The deadpan daughter of an unusual family."],
];
const otherWords = {
  What: [
    ["Hot air balloon", "A basket carried aloft by heated air."],
    ["Sourdough starter", "A living mixture of flour, water and wild yeast."],
    ["Disco ball", "A mirrored sphere that scatters light across a dance floor."],
    ["Boomerang", "A curved throwing tool that can return to its thrower."],
    ["Typewriter", "A mechanical machine that prints letters onto paper."],
    ["Roller coaster", "A fast amusement ride on a winding track."],
    ["Snow globe", "A miniature scene in liquid with floating white flakes."],
    ["Telescope", "An instrument for viewing faraway objects."],
    ["Espresso machine", "A device that forces hot water through ground coffee."],
    ["Jigsaw puzzle", "A picture assembled from interlocking pieces."],
  ],
  Where: [
    ["Sydney Opera House", "A harbour landmark with sail-shaped roofs."],
    ["The Great Barrier Reef", "A vast coral ecosystem off Queensland."],
    ["Mount Fuji", "A famous volcano on Japan’s largest island."],
    ["The Louvre", "A Paris museum that houses the Mona Lisa."],
    ["Central Park", "A large green space in the middle of Manhattan."],
    ["The Moon", "Earth’s natural satellite."],
    ["Uluru", "A large sandstone formation in central Australia."],
    ["Machu Picchu", "An Inca citadel high in the Andes."],
    ["Antarctica", "The continent around the South Pole."],
    ["The North Pole", "The northernmost point on Earth."],
  ],
};
function wordAt(id) {
  return (otherWords[category()] || words)[id];
}
let state = {
  stage: "picker",
  teamCount: 4,
  seconds: 60,
  rounds: 3,
  teamIndex: 0,
  turnIndex: 0,
  teams: defaults.map((t) => ({ name: t[0], players: t.slice(1) })),
  long: false,
  score: [0, 0, 0, 0],
  remaining: 60,
  correct: [],
  skipped: [],
  cursor: 0,
  current: null,
  hints: 3,
  skips: 3,
  hintVisible: false,
  error: "",
  modal: null,
};
let interval;
const stageNav = () =>
  `<nav class="stage-nav" aria-label="Demo screens">${stages.map(([id, label]) => `<button data-action="jump" data-value="${id}" ${state.stage === id || (id === "pause" && state.modal === "pause") ? 'aria-current="page"' : ""}>${label}</button>`).join("")}</nav>`;
const worldLinks = () =>
  `<nav class="world-links" aria-label="Aesthetics">${Object.keys(worlds)
    .map(
      (id, i) =>
        `<a href="./${id}.html" aria-label="${worlds[id].name}" ${id === theme ? 'aria-current="page"' : ""}>${i + 1}</a>`,
    )
    .join("")}</nav>`;
document.querySelector("#root").innerHTML =
  `<div class="workspace"><aside class="review"><a href="./index.html" class="back-link">All four aesthetics</a><h1>${world.name}</h1><p>${world.description}</p>${worldLinks()}<div id="desktop-nav"></div><label><input id="long-names" type="checkbox">Long names</label><small>Interactive design study · four teams<br>Local assets · no game data is saved<br>Direct screen navigation uses sample turns and scores.</small></aside><article class="phone" data-theme="${theme}" aria-label="${world.name} interactive phone demo"><header class="app-header" id="app-header"></header><main class="app-main" id="app-main"></main><footer class="app-footer" id="app-footer"></footer><div id="overlay-root"></div></article></div>`;
const main = document.querySelector("#app-main");
const footer = document.querySelector("#app-footer");
const header = document.querySelector("#app-header");
function btn(label, action, type = "", extra = "") {
  return `<button class="button ${type}" data-action="${action}" ${extra}>${label}</button>`;
}
function stepTrack(active) {
  return `<div class="step-track" aria-label="Setup progress">${["Settings", "Teams", "Review"].map((label) => (active === label ? `<b aria-current="step">${label}</b>` : `<span>${label}</span>`)).join("")}</div>`;
}
function roster(scores = false) {
  return `<ol class="roster">${state.teams
    .slice(0, state.teamCount)
    .map(
      (team, i) =>
        `<li><span class="rank">${i + 1}</span><div class="team-copy"><b>${escape(team.name)}</b><p>${team.players.map(escape).join(" · ")}</p></div>${scores ? `<span class="score">${state.score[i]}</span>` : ""}</li>`,
    )
    .join("")}</ol>`;
}
function currentTeam() {
  return state.teams[state.turnIndex % state.teamCount];
}
function currentPlayer() {
  const team = currentTeam();
  return team.players[Math.floor(state.turnIndex / state.teamCount) % team.players.length];
}
function category() {
  return ["Who", "What", "Where"][Math.floor(state.turnIndex / state.teamCount) % 3];
}
function clue() {
  if (state.current !== null) return state.current;
  return state.cursor % words.length;
}
function clock() {
  return `${Math.floor(state.remaining / 60)}:${String(state.remaining % 60).padStart(2, "0")}`;
}
function render() {
  const focusedAction = document.activeElement?.dataset?.action;
  const focusedValue = document.activeElement?.dataset?.value;
  const stage = state.stage;
  document.querySelector("#desktop-nav").innerHTML = stageNav();
  document.querySelector("#long-names").checked = state.long;
  main.className = `app-main ${stage === "play" ? "play" : "screen-enter"}`;
  main.scrollTop = 0;
  footer.className = `app-footer ${stage === "play" ? "play-footer" : ""}`;
  const setup = ["settings", "teams", "review"].includes(stage);
  header.innerHTML =
    stage === "picker"
      ? `<strong style="flex:1">RVLRY</strong><button class="demo-trigger" data-action="demo">Demo</button>`
      : `${stage === "play" ? `<div class="header-title"><b>${escape(currentTeam().name)}</b><span>${escape(currentPlayer())} · Round ${Math.floor(state.turnIndex / state.teamCount) + 1} of ${state.rounds}</span></div>` : `<button class="icon-button" data-action="back" aria-label="Back">${svg("back")}</button><div class="header-title"><b>Who What Where</b>${!setup ? "<span>RVLRY</span>" : ""}</div>`}<button class="demo-trigger" data-action="demo">Demo</button>${stage === "play" ? `<button class="icon-button" data-action="pause" aria-label="Pause turn">${svg("pause")}</button>` : ""}`;
  footer.hidden = stage === "picker";
  if (stage === "picker") {
    main.innerHTML = `<div class="picker-brand">RVLRY</div><p class="picker-note">${world.line}</p><button class="game-ticket" data-action="setup"><span class="ticket-top"><span>PASS & PLAY</span>${svg("stars")}</span><h2>Who What Where</h2><svg class="constellation" viewBox="0 0 150 150" aria-hidden="true"><path d="m15 115 35-60 55 22 24-59M50 55l25 73 30-51"/><circle cx="15" cy="115" r="3"/><circle cx="50" cy="55" r="4"/><circle cx="105" cy="77" r="3"/><circle cx="129" cy="18" r="3"/><circle cx="75" cy="128" r="3"/></svg><span class="ticket-bottom"><span>Describe. Guess. Pass it on.</span>${svg("arrow")}</span></button><div style="margin-top:auto"><div class="coming"><span>Hat Game</span><small>Coming next</small></div><div class="coming"><span>Imposter</span><small>Coming next</small></div></div>`;
  } else if (stage === "settings") {
    main.innerHTML = `${stepTrack("Settings")}<h1>Make it your game.</h1><div class="settings-row"><span>Teams</span><div class="segmented">${[2, 3, 4].map((n) => `<button data-action="set-teams" data-value="${n}" aria-pressed="${state.teamCount === n}">${n}</button>`).join("")}</div></div><label class="field">Turn length<select id="turn-length">${[30, 45, 60, 90].map((n) => `<option value="${n}" ${n === state.seconds ? "selected" : ""}>${n} seconds</option>`).join("")}</select></label><div class="settings-row"><span>Rounds</span><div class="segmented">${[1, 2, 3].map((n) => `<button data-action="set-rounds" data-value="${n}" aria-pressed="${state.rounds === n}">${n}</button>`).join("")}</div></div><hr class="settings-divider"><div><p class="small muted" style="margin-bottom:8px">Categories · one per round</p><div class="category-row"><span>Who</span><span>What</span><span>Where</span></div></div><p class="small muted">3 skips · 3 hints each turn</p>`;
    footer.innerHTML = btn(`Set up ${state.teamCount} teams ${svg("arrow")}`, "next-teams");
  } else if (stage === "teams") {
    const team = state.teams[state.teamIndex];
    main.innerHTML = `${stepTrack("Teams")}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h1>Team ${state.teamIndex + 1}</h1><div class="team-dots" aria-label="Team ${state.teamIndex + 1} of ${state.teamCount}">${Array.from({ length: state.teamCount }, (_, i) => `<span class="${i === state.teamIndex ? "active" : ""}"></span>`).join("")}</div></div><label class="field">Team name<input data-field="team" value="${escape(team.name)}" maxlength="48" autocomplete="off" enterkeyhint="next"></label><div style="display:flex;flex-direction:column;gap:10px">${team.players.map((player, i) => `<div class="field-pair"><label class="field">${i === 0 ? "First presenter" : `Presenter ${i + 1}`}<input data-field="player" data-index="${i}" value="${escape(player)}" maxlength="48" autocomplete="off" enterkeyhint="${i === team.players.length - 1 ? "done" : "next"}"></label>${i >= 2 ? `<button class="remove-player" data-action="remove-player" data-value="${i}" aria-label="Remove presenter ${i + 1}">${svg("close")}</button>` : ""}</div>`).join("")}</div>${btn(`${svg("plus")} Add player`, "add-player", "secondary", team.players.length >= 6 ? "disabled" : "")}<p class="error" role="alert">${state.error}</p>`;
    footer.innerHTML = btn(
      state.teamIndex === state.teamCount - 1
        ? `Review teams ${svg("arrow")}`
        : `Next team ${svg("arrow")}`,
      "next-team",
    );
  } else if (stage === "review") {
    main.innerHTML = `${stepTrack("Review")}<h1>Everyone in?</h1><div class="review-summary"><span>${state.teamCount} teams</span><span>${state.seconds}s turns</span><span>${state.rounds} rounds</span></div>${roster()}`;
    footer.innerHTML =
      btn("Edit teams", "edit-teams", "secondary") + btn("Start game", "start-game");
  } else if (stage === "ready") {
    main.innerHTML = `<div class="handoff"><div class="handoff-ornament">${svg("phone")}</div><p class="muted">Pass the phone to</p><h1>${escape(currentPlayer())}</h1><p class="handoff-team">${escape(currentTeam().name)}</p><div class="turn-meta"><span>Round ${Math.floor(state.turnIndex / state.teamCount) + 1} of ${state.rounds} · ${category()}</span><span>${state.seconds} seconds</span></div></div>`;
    footer.innerHTML = btn(`I'm ready ${svg("play")}`, "start-turn");
  } else if (stage === "play") {
    main.innerHTML = `<div class="play-top"><div class="timer ${state.remaining <= 10 ? "danger" : ""}" role="timer" aria-label="${state.remaining} seconds remaining">${clock()}</div><div class="play-score"><strong>${state.correct.length}</strong>correct</div></div><section class="clue" aria-label="Current clue"><span class="category">${category()}</span><h1 class="word">${escape(wordAt(clue())[0])}</h1></section><div class="hint-slot">${state.hintVisible ? `<div class="hint-copy" tabindex="0" role="region" aria-label="Hint">${escape(wordAt(clue())[1])}</div>` : btn(`${svg("bulb")} Hint · ${state.hints} left`, "hint", "secondary", state.hints <= 0 ? "disabled" : "")}</div><div class="history"><section><h2>Skipped · ${state.skipped.length}</h2><div class="history-list" tabindex="0" role="region" aria-label="Skipped clues">${state.skipped.map((id) => `<button data-action="return" data-value="${id}" class="${state.current === id ? "current" : ""}" ${state.current === id ? 'aria-current="true"' : ""}>${escape(wordAt(id)[0])}${svg("return")}</button>`).join("")}</div></section><section><h2>Guessed · ${state.correct.length}</h2><div class="history-list" tabindex="0" role="region" aria-label="Guessed clues">${[
      ...state.correct,
    ]
      .reverse()
      .map((id) => `<p>${escape(wordAt(id)[0])}</p>`)
      .join("")}</div></section></div>`;
    footer.innerHTML =
      btn(
        `${svg("skip")}<div>Skip<span>${state.skips} left</span></div>`,
        "skip",
        "secondary skip",
        state.skips <= 0 && state.current === null ? "disabled" : "",
      ) + btn(`${svg("check")} Correct`, "correct", "correct");
  } else if (stage === "recap") {
    const final = state.turnIndex >= state.teamCount * state.rounds - 1;
    main.innerHTML = `<h1>${final ? "Last turn, well played." : "Nice work."}</h1><p class="muted">${escape(currentTeam().name)}</p><div class="recap-title"><h2>This turn</h2><span class="score">+${state.correct.length}</span></div><div class="recap-list"><div><b>${state.correct.length}</b>Correct</div><div><b>${state.skipped.length}</b>Skipped</div><div><b>${3 - state.hints}</b>Hints</div></div><h2 style="margin-top:8px">Scores so far</h2>${roster(true)}`;
    footer.innerHTML = btn(
      final ? "Final scores" : `Next turn ${svg("arrow")}`,
      final ? "results" : "next-turn",
    );
  } else if (stage === "results") {
    const activeScores = state.score.slice(0, state.teamCount),
      max = Math.max(...activeScores),
      winners = state.teams.slice(0, state.teamCount).filter((_, i) => state.score[i] === max);
    main.innerHTML = `<div class="winner">${svg("trophy")}<p>${winners.length > 1 ? "A shared victory" : "Tonight’s winners"}</p><h1>${winners.map((t) => escape(t.name)).join(" & ")}</h1><p>${max} points · ${state.rounds} rounds</p></div><h2>Final scores</h2>${roster(true)}<p class="best-turn"><strong>One more round?</strong>Same people, fresh words.</p>`;
    footer.innerHTML = btn("Game picker", "picker", "secondary") + btn("Play again", "replay");
  }
  renderOverlay();
  if (!state.modal && focusedAction) {
    [...document.querySelectorAll("[data-action]")]
      .find(
        (el) =>
          el.dataset.action === focusedAction && el.dataset.value === focusedValue && !el.disabled,
      )
      ?.focus({ preventScroll: true });
  }
}
function renderOverlay() {
  const el = document.querySelector("#overlay-root");
  if (!state.modal) {
    el.innerHTML = "";
    return;
  }
  const paused = state.modal === "pause";
  el.innerHTML = `<section class="overlay" role="dialog" aria-modal="true" aria-labelledby="overlay-title">${paused ? `<div class="pause-inner">${svg("pause", 'class="pause-icon"')}<h2 id="overlay-title">Take a breather.</h2><p>Timer paused at ${clock()}.</p>${btn(`${svg("play")} Resume turn`, "resume")}${btn("End turn", "end-turn", "secondary")}</div>${btn("Game picker", "leave", "text")}` : `<div class="overlay-top"><h2 id="overlay-title">Explore the demo</h2><button class="icon-button" data-action="close-demo" aria-label="Close demo controls">${svg("close")}</button></div><p class="small muted">${world.name} · interactive design study</p>${stageNav()}<label><input type="checkbox" data-action="long-toggle" ${state.long ? "checked" : ""}>Long names</label>${worldLinks()}<a href="./index.html">All four aesthetics</a><p class="small muted">Direct screen navigation uses sample turns and scores. No game data is saved.</p>`}</section>`;
  el.querySelector("button")?.focus();
}
function startClock() {
  clearInterval(interval);
  interval = setInterval(() => {
    if (state.stage !== "play" || state.modal) return;
    state.remaining--;
    if (state.remaining <= 0) finishTurn();
    else {
      const timer = document.querySelector(".timer");
      timer.textContent = clock();
      timer.setAttribute("aria-label", `${state.remaining} seconds remaining`);
      timer.classList.toggle("danger", state.remaining <= 10);
    }
  }, 1000);
}
function resetTurn() {
  state.remaining = state.seconds;
  state.correct = [];
  state.skipped = [];
  state.cursor = (state.turnIndex * 3) % words.length;
  state.current = null;
  state.hints = 3;
  state.skips = 3;
  state.hintVisible = false;
}
function finishTurn() {
  clearInterval(interval);
  state.score[state.turnIndex % state.teamCount] += state.correct.length;
  state.stage = "recap";
  state.modal = null;
  render();
}
function nextClue() {
  if (state.current !== null) {
    state.skipped = state.skipped.filter((id) => id !== state.current);
    state.current = null;
  } else state.cursor = (state.cursor + 1) % words.length;
  state.hintVisible = false;
}
function setLong(value) {
  state.long = value;
  state.teams = (value ? longs : defaults).map((t) => ({ name: t[0], players: t.slice(1) }));
  render();
}
function jump(stage) {
  clearInterval(interval);
  state.modal = null;
  state.error = "";
  if (stage === "pause") {
    state.stage = "play";
    resetTurn();
    state.modal = "pause";
  } else {
    state.stage = stage;
    if (stage === "play") {
      resetTurn();
      startClock();
    }
    if (stage === "recap") {
      resetTurn();
      state.correct = [0, 1, 2, 3];
      state.skipped = [4, 5];
      state.hints = 2;
      state.score = [4, 3, 2, 1];
    }
    if (stage === "results") state.score = [18, 15, 13, 11];
  }
  render();
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const action = target.dataset.action,
    value = target.dataset.value;
  if (action === "jump") {
    jump(value);
    return;
  }
  if (action === "long-toggle") return;
  if (action === "demo") {
    state.modal = "demo";
    renderOverlay();
    return;
  }
  if (action === "close-demo") {
    state.modal = null;
    renderOverlay();
    return;
  }
  if (action === "pause") {
    state.modal = "pause";
    renderOverlay();
    return;
  }
  if (action === "resume") {
    state.modal = null;
    renderOverlay();
    startClock();
    document.querySelector('[data-action="pause"]').focus();
    return;
  }
  if (action === "end-turn") {
    finishTurn();
    return;
  }
  if (action === "hint") {
    if (state.hints > 0) {
      state.hints--;
      state.hintVisible = true;
    }
    render();
    return;
  }
  if (action === "correct") {
    state.correct.push(clue());
    nextClue();
    render();
    return;
  }
  if (action === "skip") {
    if (state.current !== null) {
      state.current = null;
      state.hintVisible = false;
    } else if (state.skips > 0) {
      const id = clue();
      if (!state.skipped.includes(id)) state.skipped.push(id);
      state.skips--;
      state.cursor = (state.cursor + 1) % words.length;
      state.hintVisible = false;
    }
    render();
    return;
  }
  if (action === "return") {
    state.current = Number(value);
    state.hintVisible = false;
    render();
    return;
  }
  if (action === "set-teams") state.teamCount = Number(value);
  if (action === "set-rounds") state.rounds = Number(value);
  if (action === "setup") state.stage = "settings";
  if (action === "next-teams" || action === "edit-teams") {
    state.stage = "teams";
    state.teamIndex = 0;
  }
  if (action === "add-player") {
    state.teams[state.teamIndex].players.push("");
  }
  if (action === "remove-player") {
    state.teams[state.teamIndex].players.splice(Number(value), 1);
  }
  if (action === "next-team") {
    const team = state.teams[state.teamIndex];
    if (!team.name.trim() || team.players.some((p) => !p.trim())) {
      state.error = "Give your team and each player a name.";
      render();
      main.querySelector("input").focus();
      return;
    }
    state.error = "";
    if (state.teamIndex < state.teamCount - 1) state.teamIndex++;
    else state.stage = "review";
  }
  if (action === "start-game" || action === "replay") {
    state.turnIndex = 0;
    state.score = [0, 0, 0, 0];
    state.stage = "ready";
  }
  if (action === "start-turn") {
    resetTurn();
    state.stage = "play";
    startClock();
  }
  if (action === "next-turn") {
    state.turnIndex++;
    state.stage = "ready";
  }
  if (action === "results") state.stage = "results";
  if (action === "picker" || action === "leave") {
    clearInterval(interval);
    state.stage = "picker";
    state.modal = null;
  }
  if (action === "back") {
    const back = {
      settings: "picker",
      teams: "settings",
      review: "teams",
      ready: "review",
      recap: "ready",
      results: "picker",
    };
    if (state.stage === "teams" && state.teamIndex > 0) state.teamIndex--;
    else state.stage = back[state.stage] || "picker";
  }
  render();
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.dataset.field === "team") state.teams[state.teamIndex].name = el.value;
  if (el.dataset.field === "player")
    state.teams[state.teamIndex].players[Number(el.dataset.index)] = el.value;
});
document.addEventListener("change", (event) => {
  if (event.target.id === "turn-length") state.seconds = Number(event.target.value);
  if (event.target.id === "long-names" || event.target.dataset.action === "long-toggle")
    setLong(event.target.checked);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.modal) {
    state.modal = null;
    renderOverlay();
  }
  if (state.modal && event.key === "Tab") {
    const els = [...document.querySelector(".overlay").querySelectorAll("button,a,input")].filter(
        (el) => !el.disabled,
      ),
      first = els[0],
      last = els.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (event.key === "Enter" && event.target.matches("input[data-field]")) {
    const inputs = [...main.querySelectorAll("input")],
      next = inputs[inputs.indexOf(event.target) + 1];
    if (next) {
      event.preventDefault();
      next.focus();
    } else event.target.blur();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.stage === "play" && !state.modal) {
    state.modal = "pause";
    renderOverlay();
  }
});
render();
