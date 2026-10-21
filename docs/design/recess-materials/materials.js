const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  skip: '<path d="m5 5 9 7-9 7ZM19 5v14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  return: '<path d="m9 7-5 5 5 5M4 12h10a5 5 0 0 1 5 5"/>',
  hint: '<path d="M9 18h6m-6 3h6m-7-8a6 6 0 1 1 8 0c-1 .8-1 2-1 2H9s0-1.2-1-2Z"/>',
  eyeoff:
    '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.8 5.2A11 11 0 0 1 21 12a15 15 0 0 1-3.2 4.2M6.1 6.1A16 16 0 0 0 3 12s3 7 9 7a10 10 0 0 0 4-.8"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M15 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/>',
  trophy:
    '<path d="M8 3h8v5a4 4 0 0 1-8 0Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v6m-4 3h8m-6-3h4v3h-4Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
  cards: '<path d="m4 7 3-3 13 4-4 13L3 17ZM8 7l8 2-2 8-8-2"/>',
  hat: '<path d="M2 18h20M6 18l2-14h8l2 14M7 13h10"/>',
  imposter:
    '<path d="M4 9c0-4 16-4 16 0v6c0 5-6 6-8 2-2 4-8 3-8-2Z"/><path d="m6 11 4 1m8-1-4 1M9 5l3-2 3 2"/>',
  signal: '<path d="M4 18v-3m5 3v-6m5 6V9m5 9V6"/>',
  battery: '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M23 10v4M5 10h12v4H5Z"/>',
};
const icon = (name, cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
const initial = () => ({
  screen: "play",
  wordIndex: 0,
  current: { word: "Queen Elizabeth", hint: "A British monarch with a very long reign." },
  guessed: ["Taylor Swift", "Albert Einstein"],
  skipped: ["Sherlock Holmes"],
  hint: false,
  hints: 2,
  seconds: 24,
  ticking: false,
  paused: false,
  modal: null,
  returned: false,
});
const states = { a: initial(), b: initial(), c: initial() };
const words = [
  { word: "Queen Elizabeth", hint: "A British monarch with a very long reign." },
  { word: "David Attenborough", hint: "A familiar voice from the natural world." },
  { word: "Serena Williams", hint: "An American tennis champion." },
  { word: "Harry Potter", hint: "A young wizard with a lightning-shaped scar." },
  { word: "Cleopatra", hint: "An ancient Egyptian ruler." },
  { word: "Usain Bolt", hint: "A sprinter known for his speed." },
];
function header(s) {
  const picker = s.screen === "picker";
  return `<div class="statusbar"><span>9:41</span><span class="status-icons">${icon("signal")}${icon("battery")}</span></div><header class="app-header">${picker ? "<strong>RVLRY</strong>" : `<button class="icon-button" data-action="home" aria-label="Home">${icon("home")}</button><strong>Who What Where</strong>`}${picker ? `<button class="icon-button" data-action="settings" aria-label="About this preview">${icon("settings")}</button>` : '<span class="round-label">Round 1 / 3</span>'}</header>`;
}
function footer(body) {
  return `<footer class="app-footer">${body}<div class="home-indicator"></div></footer>`;
}
function button(text, action, style = "", ico = "") {
  return `<button class="action ${style}" data-action="${action}">${ico ? icon(ico) : ""}${text}</button>`;
}
function picker() {
  return `<div class="phone-body picker-body"><div class="picker-intro"><h1>Good company.<br>Great games.</h1><p>Pick something to play.</p></div><button class="game-tile paper" data-action="handoff"><span class="game-icon">${icon("cards")}</span><span class="tile-copy"><strong>Who What<br>Where</strong><small>Describe. Guess. Beat the clock.</small></span>${icon("arrow", "arrow")}</button><button class="game-tile paper" data-action="hat"><span class="game-icon">${icon("hat")}</span><span class="tile-copy"><strong>Hat Game</strong><small>Same names. Three ways to play.</small></span>${icon("arrow", "arrow")}</button><button class="game-tile paper" data-action="imposter"><span class="game-icon">${icon("imposter")}</span><span class="tile-copy"><strong>Imposter</strong><small>One secret. One odd one out.</small></span>${icon("arrow", "arrow")}</button><p class="picker-foot">One phone. Everyone in.</p></div>${footer("")}`;
}
function handoff() {
  return `<div class="phone-body handoff-body"><div class="progress"><span class="progress-dot current"></span> Who <span class="progress-line"></span><span class="progress-dot"></span> What <span class="progress-line"></span><span class="progress-dot"></span> Where</div><section class="handoff-paper paper"><span class="handoff-stamp">${icon("eyeoff")}</span><p class="team">${icon("users")} Team 1</p><h1>Pass to<br>Alex.</h1><p>Everyone else:<br>look away.</p></section><div class="turn-meta"><span>Who</span><span>30-second turn</span></div></div>${footer(button("Start turn", "start", "wide", "play"))}`;
}
function play(s) {
  return `<div class="phone-body play-body"><div class="clock-row"><span class="clock" aria-label="${s.seconds} seconds remaining">0:${String(s.seconds).padStart(2, "0")}</span><button class="icon-button" data-action="pause" aria-label="Pause turn">${icon("pause")}</button></div><section class="clue paper" aria-live="polite"><span class="category">Who</span><h2>${s.current.word}</h2></section><div class="hint-slot">${s.hint ? `<p class="hint-copy" tabindex="0">${s.current.hint}</p>` : `<button class="hint-button" data-action="hint" ${s.hints === 0 ? "disabled" : ""}>${icon("hint")}Hint (${s.hints} left)</button>`}</div><div class="histories"><section class="history"><h3>Skipped · ${s.skipped.length}</h3><ul class="history-list">${s.skipped.length ? s.skipped.map((w, i) => `<li><button class="return-word ${s.returned && w === s.current.word ? "in-play" : ""}" data-action="return" data-index="${i}" ${s.returned && w === s.current.word ? "disabled" : ""}><span>${w}${s.returned && w === s.current.word ? "<small>In play</small>" : ""}</span>${icon("return")}</button></li>`).join("") : '<li class="empty">None yet</li>'}</ul><p class="history-cue"></p></section><section class="history"><h3>Guessed · ${s.guessed.length}</h3><ol class="history-list">${
    s.guessed.length
      ? [...s.guessed]
          .reverse()
          .map((w) => `<li class="word">${w}</li>`)
          .join("")
      : '<li class="empty">None yet</li>'
  }</ol><p class="history-cue"></p></section></div></div>${footer(`<div class="actions">${button("Skip", "skip", "skip", "skip")}${button("Correct", "correct", "", "check")}</div>`)}`;
}
function results() {
  return `<div class="phone-body results-body"><h1 class="results-title">That's a wrap.</h1><section class="result-winner paper"><span class="trophy">${icon("trophy")}</span><p>The winners</p><h2>Team 1</h2><div class="score-line"><strong>24</strong> points</div></section><section class="standings" aria-label="Final standings"><div class="standing"><span class="place">1st</span><strong>Team 1</strong><strong>24</strong></div><div class="standing"><span class="place">2nd</span><strong>Team 2</strong><strong>19</strong></div><div class="standing"><span class="place">3rd</span><strong>Team 3</strong><strong>16</strong></div></section></div>${footer(button("Play again", "handoff", "wide", "return"))}`;
}
function overlay(s) {
  if (s.paused)
    return `<section class="overlay" aria-label="Turn paused"><div class="covered paper">${icon("eyeoff")}<h2>Take a breather.</h2></div><div class="pause-actions">${button("Resume turn", "resume", "wide", "play")}${button("End demo turn", "results", "wide outline")}</div></section>`;
  if (s.modal) {
    const about = s.modal === "settings",
      name = s.modal === "hat" ? "Hat Game" : "Imposter";
    return `<section class="overlay" aria-label="${about ? "About preview" : name + " preview"}"><button class="icon-button close" data-action="close" aria-label="Close preview">${icon("close")}</button><h2>${about ? "A little more Recess." : name}</h2><p>${about ? "A material study for RVLRY. Switch the review tabs above to compare the same screen in three directions." : s.modal === "hat" ? "Same names. Three ways to play. This tile previews the picker treatment; the playable study follows Who What Where." : "One secret. One odd one out. This tile previews the picker treatment; the playable study follows Who What Where."}</p>${button("Back to games", "close", "wide", "return")}</section>`;
  }
  return "";
}
function render(id) {
  const s = states[id],
    phone = document.querySelector(`[data-phone="${id}"]`),
    active = phone.contains(document.activeElement) ? document.activeElement.dataset.action : null;
  phone.innerHTML =
    header(s) +
    (s.screen === "picker"
      ? picker()
      : s.screen === "handoff"
        ? handoff()
        : s.screen === "results"
          ? results()
          : play(s)) +
    overlay(s);
  if (active) phone.querySelector(`[data-action="${active}"]`)?.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    phone.querySelectorAll(".history-list").forEach((list) => {
      const cue = list.nextElementSibling;
      const visible = [...list.children].filter(
        (el) => el.offsetTop + el.offsetHeight <= list.offsetTop + list.clientHeight,
      ).length;
      const hidden = list.children.length - visible;
      cue.textContent = hidden > 0 ? `+${hidden} more · scroll` : "";
    });
  });
}
function nextWord(s) {
  if (s.returned) {
    s.returned = false;
  } else {
    s.wordIndex = (s.wordIndex + 1) % words.length;
  }
  s.current = words[s.wordIndex];
  s.hint = false;
}
function act(id, action, index) {
  const s = states[id];
  if (action === "home") {
    if (s.screen === "play") {
      s.paused = true;
      s.ticking = false;
      s.modal = null;
    } else {
      s.screen = "picker";
      s.modal = null;
    }
  } else if (action === "settings" || action === "hat" || action === "imposter") {
    s.modal = action;
  } else if (action === "close") {
    s.modal = null;
  } else if (action === "handoff") {
    s.screen = "handoff";
    s.paused = false;
    s.ticking = false;
  } else if (action === "start") {
    Object.assign(s, initial(), { screen: "play", seconds: 30, ticking: true });
  } else if (action === "pause") {
    s.paused = true;
    s.ticking = false;
  } else if (action === "resume") {
    s.paused = false;
    s.ticking = true;
  } else if (action === "results") {
    s.screen = "results";
    s.paused = false;
    s.ticking = false;
  } else if (action === "correct") {
    s.guessed.push(s.current.word);
    if (s.returned) s.skipped = s.skipped.filter((w) => w !== s.current.word);
    nextWord(s);
  } else if (action === "skip") {
    if (!s.skipped.includes(s.current.word)) s.skipped.unshift(s.current.word);
    nextWord(s);
  } else if (action === "hint" && s.hints > 0) {
    s.hints--;
    s.hint = true;
  } else if (action === "return") {
    if (s.returned && s.skipped[Number(index)] === s.current.word) return;
    s.current = words.find((w) => w.word === s.skipped[Number(index)]) || {
      word: s.skipped[Number(index)],
      hint: "A fictional detective from Baker Street.",
    };
    s.hint = false;
    s.returned = true;
  }
  render(id);
}
document.querySelectorAll("[data-phone]").forEach((phone) =>
  phone.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (target && !target.disabled)
      act(phone.dataset.phone, target.dataset.action, target.dataset.index);
  }),
);
document.querySelectorAll("[data-screen]").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-screen]").forEach((b) => b.removeAttribute("aria-current"));
    btn.setAttribute("aria-current", "page");
    Object.keys(states).forEach((id) => {
      states[id].screen = btn.dataset.screen;
      states[id].paused = false;
      states[id].modal = null;
      states[id].ticking = false;
      render(id);
    });
  }),
);
document.querySelectorAll("[data-direction]").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.body.dataset.direction = btn.dataset.direction;
    document.querySelectorAll("[data-direction]").forEach((b) => b.removeAttribute("aria-current"));
    btn.setAttribute("aria-current", "true");
  }),
);
document.getElementById("reset").addEventListener("click", () => {
  Object.keys(states).forEach((id) => {
    states[id] = initial();
    render(id);
  });
  document.querySelectorAll("[data-screen]").forEach((b) => {
    b.removeAttribute("aria-current");
    if (b.dataset.screen === "play") b.setAttribute("aria-current", "page");
  });
});
setInterval(
  () =>
    Object.entries(states).forEach(([id, s]) => {
      if (s.ticking && s.screen === "play" && !s.paused) {
        s.seconds = Math.max(0, s.seconds - 1);
        if (s.seconds === 0) {
          s.ticking = false;
          s.screen = "results";
          render(id);
        } else {
          const clock = document.querySelector(`[data-phone="${id}"] .clock`);
          if (clock) {
            clock.textContent = `0:${String(s.seconds).padStart(2, "0")}`;
            clock.setAttribute("aria-label", `${s.seconds} seconds remaining`);
          }
        }
      }
    }),
  1000,
);
Object.keys(states).forEach(render);

