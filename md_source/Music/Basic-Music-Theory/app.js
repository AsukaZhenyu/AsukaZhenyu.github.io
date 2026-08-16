"use strict";

const NOTES_SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SOLFEGE = ["do", "di", "re", "ri", "mi", "fa", "fi", "sol", "si", "la", "li", "ti"];
const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);
const STORAGE_KEY = "basic-music-theory-progress-v1";

const INTERVALS = [
  { semitones: 0, name: "纯一度" },
  { semitones: 1, name: "小二度" },
  { semitones: 2, name: "大二度" },
  { semitones: 3, name: "小三度" },
  { semitones: 4, name: "大三度" },
  { semitones: 5, name: "纯四度" },
  { semitones: 6, name: "增四度 / 减五度" },
  { semitones: 7, name: "纯五度" },
  { semitones: 8, name: "小六度" },
  { semitones: 9, name: "大六度" },
  { semitones: 10, name: "小七度" },
  { semitones: 11, name: "大七度" },
  { semitones: 12, name: "纯八度" }
];

const SCALE_TYPES = {
  major: { name: "自然大调", formula: [0, 2, 4, 5, 7, 9, 11, 12], degrees: ["1", "2", "3", "4", "5", "6", "7", "8"] },
  minor: { name: "自然小调", formula: [0, 2, 3, 5, 7, 8, 10, 12], degrees: ["1", "2", "♭3", "4", "5", "♭6", "♭7", "8"] },
  harmonicMinor: { name: "和声小调", formula: [0, 2, 3, 5, 7, 8, 11, 12], degrees: ["1", "2", "♭3", "4", "5", "♭6", "7", "8"] },
  pentatonic: { name: "大调五声音阶", formula: [0, 2, 4, 7, 9, 12], degrees: ["1", "2", "3", "5", "6", "8"] }
};

const CHORD_TYPES = {
  major: { suffix: "", name: "大三和弦", formula: [0, 4, 7], degrees: "1–3–5" },
  minor: { suffix: "m", name: "小三和弦", formula: [0, 3, 7], degrees: "1–♭3–5" },
  diminished: { suffix: "dim", name: "减三和弦", formula: [0, 3, 6], degrees: "1–♭3–♭5" },
  augmented: { suffix: "aug", name: "增三和弦", formula: [0, 4, 8], degrees: "1–3–♯5" },
  major7: { suffix: "maj7", name: "大七和弦", formula: [0, 4, 7, 11], degrees: "1–3–5–7" },
  minor7: { suffix: "m7", name: "小七和弦", formula: [0, 3, 7, 10], degrees: "1–♭3–5–♭7" },
  dominant7: { suffix: "7", name: "属七和弦", formula: [0, 4, 7, 10], degrees: "1–3–5–♭7" }
};

const PROGRESSIONS = {
  pop: [0, 4, 5, 3],
  classic: [0, 3, 4, 0],
  canon: [0, 4, 5, 2, 3, 0, 3, 4],
  minorPop: [5, 3, 0, 4],
  twoFiveOne: [1, 4, 0]
};

const ROMAN_NUMERALS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const DIATONIC_QUALITIES = ["major", "minor", "minor", "major", "major", "minor", "diminished"];

let audioContext = null;
let activeMetronome = null;
let metronomeBeat = 0;
let currentStaffAnswer = "C";
let currentQuiz = null;
let quizAnswered = false;
let pianoLabelMode = "note";

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function noteName(pitch) {
  return NOTES_SHARP[((pitch % 12) + 12) % 12];
}

function frequencyFromMidi(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      $("#sound-state").textContent = "当前浏览器不支持音频合成";
      return null;
    }
    audioContext = new AudioCtx();
    $("#sound-state").textContent = "声音已启用";
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(midi, duration = 0.55, delay = 0, options = {}) {
  const context = getAudioContext();
  if (!context) return;

  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  oscillator.type = options.type || "triangle";
  oscillator.frequency.setValueAtTime(frequencyFromMidi(midi), start);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(options.filter || 2400, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(options.volume || 0.16, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(filter).connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playNotes(midis, mode = "together", duration = 0.8, baseDelay = 0) {
  midis.forEach((midi, index) => {
    const delay = baseDelay + (mode === "sequence" ? index * 0.32 : 0);
    playTone(midi, duration, delay);
  });
}

function loadState() {
  const fallback = {
    completed: [],
    review: { total: 0, correct: 0, streak: 0 }
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) return fallback;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      review: { ...fallback.review, ...(parsed.review || {}) }
    };
  } catch {
    return fallback;
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 学习功能仍可继续使用，只是不保存当前浏览器中的进度。
  }
}

function updateProgressUI() {
  const total = 7;
  const count = state.completed.length;
  const percent = Math.round((count / total) * 100);
  $("#progress-ring").style.setProperty("--progress", `${percent}%`);
  $("#progress-number").textContent = `${percent}%`;
  $("#completed-count").textContent = count;
  $$('[data-complete]').forEach((button) => {
    const done = state.completed.includes(button.dataset.complete);
    button.setAttribute("aria-pressed", String(done));
    button.textContent = done ? "本章已完成" : "标记本章完成";
  });
}

function updateReviewStats() {
  const { total, correct, streak } = state.review;
  $("#review-total").textContent = total;
  $("#review-correct").textContent = correct;
  $("#review-streak").textContent = streak;
  $("#review-accuracy").textContent = total ? `${Math.round((correct / total) * 100)}%` : "—";
}

function initializeProgress() {
  $$('[data-complete]').forEach((button) => {
    button.addEventListener("click", () => {
      const chapter = button.dataset.complete;
      if (state.completed.includes(chapter)) {
        state.completed = state.completed.filter((item) => item !== chapter);
      } else {
        state.completed.push(chapter);
      }
      saveState();
      updateProgressUI();
    });
  });

  $("#reset-progress").addEventListener("click", () => {
    if (!window.confirm("确定要清除章节进度和练习统计吗？")) return;
    state = { completed: [], review: { total: 0, correct: 0, streak: 0 } };
    saveState();
    updateProgressUI();
    updateReviewStats();
  });

  updateProgressUI();
  updateReviewStats();
}

function initializeChapterObserver() {
  if (!("IntersectionObserver" in window)) return;
  const links = $$(".chapter-nav a");
  const sections = links.map((link) => $(link.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`));
  }, { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.2, 0.5] });
  sections.forEach((section) => observer.observe(section));
}

function buildPiano() {
  const piano = $("#piano");
  piano.innerHTML = "";
  for (let midi = 60; midi <= 84; midi += 1) {
    const pitch = midi % 12;
    const isWhite = WHITE_PITCHES.has(pitch);
    const key = document.createElement("button");
    key.type = "button";
    key.className = `piano-key ${isWhite ? "white" : "black"}`;
    key.dataset.midi = midi;
    key.dataset.pitch = pitch;
    key.setAttribute("aria-label", `${noteName(pitch)}${Math.floor(midi / 12) - 1}`);
    const label = document.createElement("span");
    key.append(label);
    key.addEventListener("pointerdown", () => playPianoKey(key));
    piano.append(key);
  }
  updatePianoLabels();
}

function updatePianoLabels() {
  $$(".piano-key").forEach((key) => {
    const pitch = Number(key.dataset.pitch);
    const midi = Number(key.dataset.midi);
    const octave = Math.floor(midi / 12) - 1;
    const label = $("span", key);
    if (pianoLabelMode === "note") label.textContent = `${noteName(pitch)}${octave}`;
    if (pianoLabelMode === "solfege") label.textContent = SOLFEGE[pitch];
    if (pianoLabelMode === "none") label.textContent = "";
  });
}

function playPianoKey(key) {
  const midi = Number(key.dataset.midi);
  const pitch = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  playTone(midi, 0.75);
  key.classList.add("is-playing");
  window.setTimeout(() => key.classList.remove("is-playing"), 180);
  $("#piano-readout").innerHTML = `
    <span class="readout-note">${noteName(pitch)}</span>
    <span><b>${noteName(pitch)}${octave}</b> · 唱名 ${SOLFEGE[pitch]} · ${frequencyFromMidi(midi).toFixed(2)} Hz · MIDI ${midi}</span>
  `;
}

function initializePiano() {
  buildPiano();
  $$('[data-label-mode]').forEach((button) => {
    button.addEventListener("click", () => {
      pianoLabelMode = button.dataset.labelMode;
      $$('[data-label-mode]').forEach((item) => item.classList.toggle("is-active", item === button));
      updatePianoLabels();
    });
  });

  const keyboardMap = {
    a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66,
    g: 67, y: 68, h: 69, u: 70, j: 71, k: 72
  };
  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    const midi = keyboardMap[event.key.toLowerCase()];
    if (midi === undefined) return;
    const key = $(`.piano-key[data-midi="${midi}"]`);
    if (key) playPianoKey(key);
  });
}

const STAFF_NOTES = {
  treble: [
    { name: "C", label: "C4", step: 12 }, { name: "D", label: "D4", step: 11 },
    { name: "E", label: "E4", step: 10 }, { name: "F", label: "F4", step: 9 },
    { name: "G", label: "G4", step: 8 }, { name: "A", label: "A4", step: 7 },
    { name: "B", label: "B4", step: 6 }, { name: "C", label: "C5", step: 5 },
    { name: "D", label: "D5", step: 4 }, { name: "E", label: "E5", step: 3 },
    { name: "F", label: "F5", step: 2 }, { name: "G", label: "G5", step: 1 }
  ],
  bass: [
    { name: "E", label: "E2", step: 12 }, { name: "F", label: "F2", step: 11 },
    { name: "G", label: "G2", step: 10 }, { name: "A", label: "A2", step: 9 },
    { name: "B", label: "B2", step: 8 }, { name: "C", label: "C3", step: 7 },
    { name: "D", label: "D3", step: 6 }, { name: "E", label: "E3", step: 5 },
    { name: "F", label: "F3", step: 4 }, { name: "G", label: "G3", step: 3 },
    { name: "A", label: "A3", step: 2 }, { name: "B", label: "B3", step: 1 }
  ]
};

function newStaffQuestion() {
  const clef = $("#clef-select").value;
  const notes = STAFF_NOTES[clef];
  const item = notes[Math.floor(Math.random() * notes.length)];
  currentStaffAnswer = item.name;
  $("#staff-note").style.setProperty("--note-top", `${item.step * 10 - 20}px`);
  $("#staff-note").dataset.label = item.label;
  $("#clef-symbol").textContent = clef === "treble" ? "𝄞" : "𝄢";
  $("#staff-feedback").className = "feedback";
  $("#staff-feedback").textContent = "选择一个答案。";
  $$("#staff-answers button").forEach((button) => {
    button.disabled = false;
    button.className = "";
  });
}

function initializeStaffPractice() {
  const answers = $("#staff-answers");
  ["C", "D", "E", "F", "G", "A", "B"].forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("click", () => {
      const correct = name === currentStaffAnswer;
      $$("button", answers).forEach((item) => {
        item.disabled = true;
        if (item.textContent === currentStaffAnswer) item.classList.add("is-correct");
      });
      if (!correct) button.classList.add("is-wrong");
      const exact = $("#staff-note").dataset.label;
      const feedback = $("#staff-feedback");
      feedback.className = `feedback ${correct ? "correct" : "wrong"}`;
      feedback.textContent = correct ? `正确，这是 ${exact}。` : `答案是 ${exact}。沿着线与间逐级数音名会更可靠。`;
    });
    answers.append(button);
  });
  $("#next-staff-note").addEventListener("click", newStaffQuestion);
  $("#clef-select").addEventListener("change", newStaffQuestion);
  newStaffQuestion();
}

function renderBeatDots() {
  const beats = Number($("#meter-select").value);
  const container = $("#beat-dots");
  container.innerHTML = "";
  for (let index = 0; index < beats; index += 1) {
    const dot = document.createElement("span");
    dot.className = "beat-dot";
    dot.textContent = index + 1;
    container.append(dot);
  }
  metronomeBeat = 0;
}

function tickMetronome() {
  const dots = $$(".beat-dot");
  if (!dots.length) return;
  dots.forEach((dot, index) => dot.classList.toggle("is-active", index === metronomeBeat));
  playTone(metronomeBeat === 0 ? 84 : 77, 0.07, 0, { type: "square", volume: 0.09, filter: 3000 });
  metronomeBeat = (metronomeBeat + 1) % dots.length;
}

function startMetronome() {
  stopMetronome();
  const bpm = Number($("#tempo-slider").value);
  tickMetronome();
  activeMetronome = window.setInterval(tickMetronome, 60000 / bpm);
  $("#metronome-toggle").textContent = "停止";
  $("#metronome-toggle").classList.add("is-running");
}

function stopMetronome() {
  if (activeMetronome) window.clearInterval(activeMetronome);
  activeMetronome = null;
  $$(".beat-dot").forEach((dot) => dot.classList.remove("is-active"));
  $("#metronome-toggle").textContent = "开始";
  $("#metronome-toggle").classList.remove("is-running");
}

function initializeRhythm() {
  renderBeatDots();
  $("#tempo-slider").addEventListener("input", (event) => {
    $("#tempo-number").textContent = event.target.value;
    if (activeMetronome) startMetronome();
  });
  $("#meter-select").addEventListener("change", () => {
    renderBeatDots();
    if (activeMetronome) startMetronome();
  });
  $("#metronome-toggle").addEventListener("click", () => {
    if (activeMetronome) stopMetronome();
    else startMetronome();
  });
  $$("#note-values button").forEach((button) => {
    button.addEventListener("click", () => {
      const beats = Number(button.dataset.beats);
      const bpm = Number($("#tempo-slider").value);
      const duration = Math.max(0.1, beats * 60 / bpm);
      button.classList.add("is-counting");
      playTone(72, duration * 0.85, 0, { type: "sine", volume: 0.12 });
      window.setTimeout(() => button.classList.remove("is-counting"), duration * 1000);
    });
  });
}

function populateNoteSelect(select, includeSharps = true) {
  select.innerHTML = "";
  NOTES_SHARP.forEach((name, pitch) => {
    if (!includeSharps && !WHITE_PITCHES.has(pitch)) return;
    const option = document.createElement("option");
    option.value = pitch;
    option.textContent = name;
    select.append(option);
  });
}

function buildMiniKeyboard(container, activePitches, rootPitch) {
  container.innerHTML = "";
  for (let midi = 60; midi < 72; midi += 1) {
    const pitch = midi % 12;
    const key = document.createElement("span");
    key.className = `mini-key ${WHITE_PITCHES.has(pitch) ? "white" : "black"}`;
    key.textContent = noteName(pitch);
    if (activePitches.includes(pitch)) key.classList.add("is-active");
    if (pitch === rootPitch) key.classList.add("is-root");
    container.append(key);
  }
}

function updateInterval() {
  const root = Number($("#interval-root").value);
  const semitones = Number($("#interval-distance").value);
  const resultPitch = (root + semitones) % 12;
  const interval = INTERVALS.find((item) => item.semitones === semitones);
  $("#interval-result").innerHTML = `<span>结果音</span><b>${noteName(resultPitch)}</b><small>${interval.name} · ${semitones} 个半音</small>`;
  buildMiniKeyboard($("#interval-keyboard"), [root, resultPitch], root);
}

function initializeIntervals() {
  populateNoteSelect($("#interval-root"));
  INTERVALS.forEach((interval) => {
    const option = document.createElement("option");
    option.value = interval.semitones;
    option.textContent = `${interval.name} · ${interval.semitones} 半音`;
    $("#interval-distance").append(option);
  });
  $("#interval-distance").value = "7";
  $("#interval-root").addEventListener("change", updateInterval);
  $("#interval-distance").addEventListener("change", updateInterval);
  $("#play-interval-melodic").addEventListener("click", () => {
    const root = Number($("#interval-root").value);
    const distance = Number($("#interval-distance").value);
    playNotes([60 + root, 60 + root + distance], "sequence", 0.62);
  });
  $("#play-interval-harmonic").addEventListener("click", () => {
    const root = Number($("#interval-root").value);
    const distance = Number($("#interval-distance").value);
    playNotes([60 + root, 60 + root + distance], "together", 0.9);
  });
  updateInterval();
}

function getScale(root, type) {
  return SCALE_TYPES[type].formula.map((offset) => root + offset);
}

function updateScale() {
  const root = Number($("#scale-root").value);
  const type = $("#scale-type").value;
  const scale = getScale(root, type);
  const config = SCALE_TYPES[type];
  const container = $("#scale-notes");
  container.innerHTML = "";
  scale.forEach((pitch, index) => {
    const item = document.createElement("span");
    item.className = "degree-note";
    item.innerHTML = `<b>${noteName(pitch)}</b><small>${config.degrees[index]} 级</small>`;
    container.append(item);
  });
  buildMiniKeyboard($("#scale-keyboard"), scale.map((pitch) => pitch % 12), root);
}

function initializeScales() {
  populateNoteSelect($("#scale-root"));
  $("#scale-root").addEventListener("change", updateScale);
  $("#scale-type").addEventListener("change", updateScale);
  $("#play-scale").addEventListener("click", () => {
    const root = Number($("#scale-root").value);
    const type = $("#scale-type").value;
    playNotes(getScale(root, type).map((pitch) => 60 + pitch), "sequence", 0.45);
  });
  updateScale();
}

function getChord(root, type, inversion = 0) {
  const formula = CHORD_TYPES[type].formula;
  const notes = formula.map((offset) => root + offset);
  const validInversion = Math.min(inversion, notes.length - 1);
  for (let index = 0; index < validInversion; index += 1) notes[index] += 12;
  return notes.sort((a, b) => a - b);
}

function updateChord() {
  const root = Number($("#chord-root").value);
  const type = $("#chord-type").value;
  const requestedInversion = Number($("#chord-inversion").value);
  const config = CHORD_TYPES[type];
  const inversion = Math.min(requestedInversion, config.formula.length - 1);
  if (requestedInversion !== inversion) $("#chord-inversion").value = String(inversion);
  const chord = getChord(root, type, inversion);
  $("#chord-readout").innerHTML = `
    <strong class="chord-name">${noteName(root)}${config.suffix}</strong>
    ${chord.map((pitch) => `<span class="chord-tone">${noteName(pitch)}</span>`).join("")}
    <span class="chord-formula">${config.name} · ${config.degrees}</span>
  `;
  buildMiniKeyboard($("#chord-keyboard"), chord.map((pitch) => pitch % 12), root);
}

function initializeChords() {
  populateNoteSelect($("#chord-root"));
  ["#chord-root", "#chord-type", "#chord-inversion"].forEach((selector) => $(selector).addEventListener("change", updateChord));
  $("#play-chord").addEventListener("click", () => {
    const chord = getChord(Number($("#chord-root").value), $("#chord-type").value, Number($("#chord-inversion").value));
    playNotes(chord.map((pitch) => 60 + pitch), "together", 1.15);
  });
  $("#arpeggiate-chord").addEventListener("click", () => {
    const chord = getChord(Number($("#chord-root").value), $("#chord-type").value, Number($("#chord-inversion").value));
    playNotes(chord.map((pitch) => 60 + pitch), "sequence", 0.58);
  });
  updateChord();
}

function progressionData() {
  const key = Number($("#progression-key").value);
  const degrees = PROGRESSIONS[$("#progression-type").value];
  return degrees.map((degree) => {
    const root = key + MAJOR_SCALE[degree];
    const type = DIATONIC_QUALITIES[degree];
    return {
      degree,
      roman: ROMAN_NUMERALS[degree],
      root,
      type,
      name: `${noteName(root)}${CHORD_TYPES[type].suffix}`,
      notes: getChord(root, type)
    };
  });
}

function updateProgression() {
  const data = progressionData();
  const track = $("#progression-track");
  track.style.setProperty("--chord-count", data.length);
  track.innerHTML = data.map((chord, index) => `
    <div class="progression-chord" data-index="${index}">
      <b>${chord.name}</b><span>${chord.roman}</span>
    </div>
  `).join("");
}

function initializeHarmony() {
  populateNoteSelect($("#progression-key"));
  $("#progression-key").addEventListener("change", updateProgression);
  $("#progression-type").addEventListener("change", updateProgression);
  $("#play-progression").addEventListener("click", () => {
    const data = progressionData();
    data.forEach((chord, index) => {
      const delay = index * 0.78;
      playNotes(chord.notes.map((pitch) => 48 + pitch), "together", 0.72, delay);
      window.setTimeout(() => {
        $$(".progression-chord").forEach((card) => card.classList.remove("is-playing"));
        const card = $(`.progression-chord[data-index="${index}"]`);
        if (card) card.classList.add("is-playing");
      }, delay * 1000);
    });
    window.setTimeout(() => $$(".progression-chord").forEach((card) => card.classList.remove("is-playing")), data.length * 780 + 250);
  });
  updateProgression();
}

function shuffle(array) {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const random = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[random]] = [copy[random], copy[index]];
  }
  return copy;
}

function uniqueOptions(correct, pool, count = 4) {
  const others = shuffle([...new Set(pool.filter((item) => item !== correct))]).slice(0, count - 1);
  return shuffle([correct, ...others]);
}

function makeIntervalQuiz() {
  const root = Math.floor(Math.random() * 12);
  const choices = INTERVALS.filter((item) => [1, 2, 3, 4, 5, 7, 8, 9, 10, 12].includes(item.semitones));
  const interval = choices[Math.floor(Math.random() * choices.length)];
  const target = (root + interval.semitones) % 12;
  return {
    topic: "音程",
    question: `${noteName(root)} 向上到 ${noteName(target)}，相距 ${interval.semitones} 个半音。这是什么音程？`,
    context: "同时考虑半音数与音程名称。",
    answer: interval.name,
    options: uniqueOptions(interval.name, choices.map((item) => item.name)),
    explanation: `${interval.name}包含 ${interval.semitones} 个半音。`,
    audio: () => playNotes([60 + root, 60 + root + interval.semitones], "sequence", 0.55)
  };
}

function makeScaleQuiz() {
  const root = Math.floor(Math.random() * 12);
  const type = Math.random() > 0.5 ? "major" : "minor";
  const scale = getScale(root, type).slice(0, -1).map((pitch) => noteName(pitch));
  const degree = 1 + Math.floor(Math.random() * 6);
  const answer = scale[degree];
  return {
    topic: "音阶",
    question: `${noteName(root)} ${SCALE_TYPES[type].name}的第 ${degree + 1} 级是什么音？`,
    context: `先根据${SCALE_TYPES[type].name}的全音、半音公式推导。`,
    answer,
    options: uniqueOptions(answer, NOTES_SHARP),
    explanation: `${noteName(root)} ${SCALE_TYPES[type].name}为 ${scale.join("–")}，所以答案是 ${answer}。`
  };
}

function makeChordQuiz() {
  const root = Math.floor(Math.random() * 12);
  const types = ["major", "minor", "diminished", "augmented"];
  const type = types[Math.floor(Math.random() * types.length)];
  const config = CHORD_TYPES[type];
  const answer = getChord(root, type).map((pitch) => noteName(pitch)).join("–");
  const possible = types.map((candidate) => getChord(root, candidate).map((pitch) => noteName(pitch)).join("–"));
  return {
    topic: "和弦",
    question: `${noteName(root)} ${config.name}由哪些音组成？`,
    context: `级数公式：${config.degrees}。`,
    answer,
    options: uniqueOptions(answer, possible),
    explanation: `${config.name}的半音结构是 ${config.formula.join("–")}，所以组成音是 ${answer}。`,
    audio: () => playNotes(getChord(root, type).map((pitch) => 60 + pitch), "together", 0.9)
  };
}

function makeRhythmQuiz() {
  const questions = [
    { q: "以四分音符为一拍时，一个二分音符持续几拍？", a: "2 拍", e: "二分音符等于两个四分音符，因此持续 2 拍。" },
    { q: "以四分音符为一拍时，两个八分音符合计几拍？", a: "1 拍", e: "每个八分音符是半拍，两个合计 1 拍。" },
    { q: "3/4 拍每小节包含几拍？", a: "3 拍", e: "拍号上方的 3 表示每小节有 3 拍。" },
    { q: "4/4 拍中，全音符通常占据几拍？", a: "4 拍", e: "全音符等于四个四分音符，正好填满一个 4/4 小节。" }
  ];
  const item = questions[Math.floor(Math.random() * questions.length)];
  return {
    topic: "节奏",
    question: item.q,
    context: "把音符时值换算成四分音符的拍数。",
    answer: item.a,
    options: uniqueOptions(item.a, ["1/2 拍", "1 拍", "2 拍", "3 拍", "4 拍"]),
    explanation: item.e
  };
}

function makePitchQuiz() {
  const midi = 60 + Math.floor(Math.random() * 12);
  const pitch = midi % 12;
  return {
    topic: "听音与音名",
    question: "试听这个音，它对应下面哪个音名？",
    context: "可以重复试听；这里只比较十二个音级，不区分八度。",
    answer: noteName(pitch),
    options: uniqueOptions(noteName(pitch), NOTES_SHARP),
    explanation: `这个音是 ${noteName(pitch)}，MIDI 音高编号为 ${midi}。`,
    audio: () => playTone(midi, 0.8)
  };
}

function renderQuiz() {
  const generators = [makeIntervalQuiz, makeScaleQuiz, makeChordQuiz, makeRhythmQuiz, makePitchQuiz];
  const generator = generators[Math.floor(Math.random() * generators.length)];
  currentQuiz = generator();
  quizAnswered = false;
  $("#quiz-topic").textContent = currentQuiz.topic;
  $("#quiz-question").textContent = currentQuiz.question;
  $("#quiz-context").textContent = currentQuiz.context;
  $("#quiz-feedback").textContent = "";
  $("#quiz-feedback").className = "quiz-feedback";
  $("#next-quiz").textContent = "换一道题";
  const audioButton = $("#quiz-audio");
  audioButton.hidden = !currentQuiz.audio;
  const options = $("#quiz-options");
  options.innerHTML = "";
  currentQuiz.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => answerQuiz(button, option));
    options.append(button);
  });
}

function answerQuiz(button, option) {
  if (quizAnswered || !currentQuiz) return;
  quizAnswered = true;
  const correct = option === currentQuiz.answer;
  state.review.total += 1;
  if (correct) {
    state.review.correct += 1;
    state.review.streak += 1;
  } else {
    state.review.streak = 0;
  }
  $$("#quiz-options button").forEach((item) => {
    item.disabled = true;
    if (item.textContent === currentQuiz.answer) item.classList.add("is-correct");
  });
  if (!correct) button.classList.add("is-wrong");
  const feedback = $("#quiz-feedback");
  feedback.className = `quiz-feedback ${correct ? "correct" : "wrong"}`;
  feedback.textContent = `${correct ? "回答正确。" : "再想一步。"} ${currentQuiz.explanation}`;
  saveState();
  updateReviewStats();
}

function initializeQuiz() {
  $("#next-quiz").addEventListener("click", renderQuiz);
  $("#quiz-audio").addEventListener("click", () => {
    if (currentQuiz && currentQuiz.audio) currentQuiz.audio();
  });
}

function initialize() {
  initializeProgress();
  initializeChapterObserver();
  initializePiano();
  initializeStaffPractice();
  initializeRhythm();
  initializeIntervals();
  initializeScales();
  initializeChords();
  initializeHarmony();
  initializeQuiz();
}

document.addEventListener("DOMContentLoaded", initialize);
window.addEventListener("beforeunload", stopMetronome);
