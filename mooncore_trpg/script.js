const ABILITIES = [
  ["STR", "パワー"],
  ["DEX", "スピード"],
  ["CON", "耐久力"],
  ["INT", "知性"],
  ["POW", "意志"]
];

const SKILLS = [
  ["RSH", "研究"],
  ["TAC", "戦闘"],
  ["ENG", "技術"],
  ["MED", "医療"],
  ["OPS", "情報"],
  ["CWD", "指導"]
];

const JOBS = {
  RSH: "研究職",
  TAC: "戦闘員",
  ENG: "技術者",
  MED: "医療職",
  OPS: "情報員",
  CWD: "指導者"
};

const SOCIALS = [
  ["CL", "社会信用度"],
  ["RNK", "権限"],
  ["INF", "影響力"]
];

let state = {
  diceTotal: 0,
  abilities: {STR:0, DEX:0, CON:0, INT:0, POW:0},
  job: "",
  skills: {RSH:0, TAC:0, ENG:0, MED:0, OPS:0, CWD:0},
  social: {CL:0, RNK:0, INF:0},
  SYN: 0,
  CE: 3,
  PE: 3
};

const $ = id => document.getElementById(id);

function ceil(n) { return Math.ceil(n); }
function numberValue(id) {
  const n = Number($(id).value);
  return Number.isFinite(n) ? n : 0;
}
function textValue(id) { return $(id).value.trim(); }

function init() {
  renderAbilities();
  renderJobs();
  renderSkills();
  renderSocial();
  bindProfile();
  $("economicStatus").addEventListener("change", update);
  $("SYN").addEventListener("input", () => {
    state.SYN = Math.max(0, numberValue("SYN"));
    update();
  });
  $("CE").addEventListener("input", () => {
    state.CE = clampInt(numberValue("CE"), 0, 5);
    $("CE").value = state.CE;
    update();
  });
  $("PE").addEventListener("input", () => {
    state.PE = clampInt(numberValue("PE"), 0, 5);
    $("PE").value = state.PE;
    update();
  });
  $("rollDice").addEventListener("click", rollDice);
  $("save").addEventListener("click", saveData);
  $("load").addEventListener("click", loadData);
  $("copySheet").addEventListener("click", copyCharacterSheet);
  $("copyJson").addEventListener("click", copyCocofoliaJson);
  $("downloadJson").addEventListener("click", downloadCocofolia);
  $("reset").addEventListener("click", resetAll);
  update();
}

function renderAbilities() {
  $("abilityGrid").innerHTML = ABILITIES.map(([code, name]) => `
    <div class="stat-card">
      <span class="stat-code">${code}</span>
      <span class="stat-name">${name}</span>
      <input id="${code}" type="number" min="0" max="20" value="0">
    </div>
  `).join("");

  ABILITIES.forEach(([code]) => {
    $(code).addEventListener("input", () => {
      let value = Math.floor(numberValue(code));
      if (value > 20) value = 20;
      if (value < 0) value = 0;
      $(code).value = value;
      state.abilities[code] = value;
      update();
    });
  });
}

function renderJobs() {
  $("jobGrid").innerHTML = Object.entries(JOBS).map(([code, name]) => `
    <div class="job-card" data-job="${code}">
      <div class="job-code">${code}</div>
      <div class="job-name">${name}</div>
    </div>
  `).join("");

  document.querySelectorAll(".job-card").forEach(card => {
    card.addEventListener("click", () => {
      state.job = card.dataset.job;
      document.querySelectorAll(".job-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      update();
    });
  });
}

function renderSkills() {
  $("skillGrid").innerHTML = SKILLS.map(([code, name]) => `
    <div class="skill-card">
      <div class="skill-label"><strong>${code}</strong><span>${name}</span></div>
      <input id="skill_${code}" type="number" min="0" max="99" value="0">
    </div>
  `).join("");

  SKILLS.forEach(([code]) => {
    $(`skill_${code}`).addEventListener("input", () => {
      state.skills[code] = clampInt(numberValue(`skill_${code}`), 0, 99);
      $(`skill_${code}`).value = state.skills[code];
      normalizePointGroup("skills");
      update();
    });
  });
}

function renderSocial() {
  $("socialGrid").innerHTML = SOCIALS.map(([code, name]) => `
    <div class="social-card">
      <div class="social-label"><strong>${code}</strong><span>${name}</span></div>
      <input id="social_${code}" type="number" min="0" value="0">
    </div>
  `).join("");

  SOCIALS.forEach(([code]) => {
    $(`social_${code}`).addEventListener("input", () => {
      state.social[code] = Math.max(0, Math.floor(numberValue(`social_${code}`)));
      normalizePointGroup("social");
      update();
    });
  });
}

function bindProfile() {
  [
    "name","birthCountry","residenceCountry","profileJob","age","gender","height",
    "personality","appearance","clothing","hairstyle","likes","dislikes","hobbies",
    "specialty","family","history","residence","dailyLife","speech","firstPerson","notes"
  ].forEach(id => $(id).addEventListener("input", update));
}

function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function economicStatus() {
  const el = $("economicStatus");
  return el ? el.value : "self";
}

function isDependent() {
  return economicStatus() === "dependent";
}

/* 月収・所持金は RNK+1 をベースラインにすることで、RNK0による事故的な0円化を防ぐ。
   「扶養・無収入」はプレイヤーが意図的に選ぶ背景設定として別枠で0円にする。 */
function incomeValue(jobSkill, RNK) {
  if (isDependent()) return 0;
  return jobSkill * (RNK + 1) * 1000;
}

function moneyValue(jobSkill, RNK) {
  if (isDependent()) return 0;
  return jobSkill * (RNK + 1) * 10000;
}

function incomeText(jobSkill, RNK) {
  return isDependent() ? "0円（扶養・無収入）" : `${incomeValue(jobSkill, RNK).toLocaleString()}円`;
}

function moneyText(jobSkill, RNK) {
  return isDependent() ? "0円（扶養・無収入）" : `${moneyValue(jobSkill, RNK).toLocaleString()}円`;
}

function rollDice() {
  state.diceTotal = Array.from({length:5}, () => Math.floor(Math.random()*4)+1)
    .reduce((a,b) => a+b, 0);

  state.abilities = {STR:1, DEX:1, CON:1, INT:1, POW:1};
  let remaining = state.diceTotal - 5;
  const codes = ABILITIES.map(a => a[0]);

  while (remaining > 0) {
    const code = codes[Math.floor(Math.random()*codes.length)];
    if (state.abilities[code] < 20) {
      state.abilities[code]++;
      remaining--;
    }
  }

  ABILITIES.forEach(([code]) => $(code).value = state.abilities[code]);
  update();
}

function abilityTotal() {
  return Object.values(state.abilities).reduce((a,b) => a+b, 0);
}

function skillPointTotal() {
  return (state.abilities.INT + state.abilities.POW) * 10;
}

function socialPointTotal() {
  if (!state.job) return 0;
  return ceil((state.skills[state.job] || 0) / 10);
}

function normalizePointGroup(type) {
  const total = type === "skills" ? skillPointTotal() : socialPointTotal();
  const obj = type === "skills" ? state.skills : state.social;
  const keys = type === "skills" ? SKILLS.map(x=>x[0]) : SOCIALS.map(x=>x[0]);
  let used = keys.reduce((s,k)=>s+(obj[k]||0),0);

  if (used <= total) return;

  let excess = used - total;
  for (let i = keys.length - 1; i >= 0 && excess > 0; i--) {
    const k = keys[i];
    const remove = Math.min(obj[k], excess);
    obj[k] -= remove;
    excess -= remove;
  }

  keys.forEach(k => {
    const id = type === "skills" ? `skill_${k}` : `social_${k}`;
    $(id).value = obj[k];
  });
}

function update() {
  state.abilities = Object.fromEntries(ABILITIES.map(([code]) => [code, clampInt(numberValue(code),0,20)]));
  state.SYN = Math.max(0, numberValue("SYN"));

  const skillTotal = skillPointTotal();
  const skillUsed = Object.values(state.skills).reduce((a,b)=>a+b,0);
  const socialTotal = socialPointTotal();
  const socialUsed = Object.values(state.social).reduce((a,b)=>a+b,0);

  $("diceTotal").textContent = state.diceTotal || "未決定";
  $("abilityTotal").textContent = state.diceTotal || 0;
  $("abilityUsed").textContent = abilityTotal();

  $("skillTotal").textContent = skillTotal;
  $("skillRemaining").textContent = Math.max(0, skillTotal - skillUsed);
  $("socialTotal").textContent = socialTotal;
  $("socialRemaining").textContent = Math.max(0, socialTotal - socialUsed);

  $("selectedJob").textContent = state.job ? `${state.job} ${JOBS[state.job]}` : "未選択";

  const CON = state.abilities.CON;
  const POW = state.abilities.POW;
  const DEX = state.abilities.DEX;
  const jobSkill = state.job ? state.skills[state.job] : 0;
  const RNK = state.social.RNK;

  $("HP").textContent = CON * 2;
  $("SAN").textContent = POW * 10;
  $("AP").textContent = ceil(DEX / 2);
  $("income").textContent = incomeText(jobSkill, RNK);
  $("money").textContent = moneyText(jobSkill, RNK);

  const validAbility = state.diceTotal > 0 && abilityTotal() === state.diceTotal &&
    ABILITIES.every(([code]) => state.abilities[code] >= 1 && state.abilities[code] <= 20);

  $("abilityMessage").textContent = !state.diceTotal
    ? "5D4を振って能力値の合計を決定してください。"
    : validAbility
      ? "能力値の割り振りは有効です。"
      : "能力値は5D4の合計と一致させ、各能力値を1以上20以下にしてください。";

  $("preview").textContent = buildPreview();
}

function profileData() {
  const ids = [
    "name","birthCountry","residenceCountry","profileJob","age","gender","height",
    "personality","appearance","clothing","hairstyle","likes","dislikes","hobbies",
    "specialty","family","history","residence","dailyLife","speech","firstPerson","notes",
    "economicStatus"
  ];
  return Object.fromEntries(ids.map(id => [id, textValue(id)]));
}

function buildPreview() {
  const p = profileData();
  const jobSkill = state.job ? state.skills[state.job] : 0;
  const lines = [
    "未来世界 TRPG",
    "CHARACTER SHEET",
    "",
    "【プロフィール】",
    `名前：${p.name}`,
    `出身国：${p.birthCountry}`,
    `在住国：${p.residenceCountry}`,
    `職業：${p.profileJob || (state.job ? JOBS[state.job] : "")}`,
    `性格：${p.personality}`,
    `年齢：${p.age}`,
    `性別：${p.gender}`,
    `身長：${p.height}`,
    `容姿：${p.appearance}`,
    `服装：${p.clothing}`,
    `髪型：${p.hairstyle}`,
    `好き：${p.likes}`,
    `嫌い：${p.dislikes}`,
    `趣味：${p.hobbies}`,
    `特技：${p.specialty}`,
    `家族：${p.family}`,
    `経歴：${p.history}`,
    `住居：${p.residence}`,
    `普段の生活：${p.dailyLife}`,
    `話し方：${p.speech}`,
    `一人称：${p.firstPerson}`,
    "",
    "【能力値】",
    ...ABILITIES.map(([code]) => `${code}：${state.abilities[code]}`),
    `SYN：${state.SYN}`,
    "",
    "【職業・技能】",
    `職業技能：${state.job ? state.job + " " + JOBS[state.job] : "未選択"}`,
    `職業技能値：${jobSkill}`,
    ...SKILLS.map(([code,name]) => `${code} ${name}：${state.skills[code]}`),
    "",
    "【社会】",
    ...SOCIALS.map(([code,name]) => `${code} ${name}：${state.social[code]}`),
    "",
    "【計算値】",
    `HP：${$("HP").textContent}`,
    `SAN：${$("SAN").textContent}`,
    `AP：${$("AP").textContent}`,
    `CE：${state.CE}`,
    `PE：${state.PE}`,
    `経済状況：${isDependent() ? "扶養・無収入" : "自活"}`,
    `月収：${incomeText(jobSkill, state.social.RNK)}`,
    `所持金：${moneyText(jobSkill, state.social.RNK)}`,
    "",
  ];
  return lines.join("\n");
}

function buildCocofoliaMemo() {
  const p = profileData();
  const jobSkill = state.job ? state.skills[state.job] : 0;
  const lines = [
    "【プロフィール】",
    `名前：${p.name}`,
    `出身国：${p.birthCountry}`,
    `在住国：${p.residenceCountry}`,
    `職業：${p.profileJob || (state.job ? JOBS[state.job] : "")}`,
    `性格：${p.personality}`,
    `年齢：${p.age}`,
    `性別：${p.gender}`,
    `身長：${p.height}`,
    `容姿：${p.appearance}`,
    `服装：${p.clothing}`,
    `髪型：${p.hairstyle}`,
    `好き：${p.likes}`,
    `嫌い：${p.dislikes}`,
    `趣味：${p.hobbies}`,
    `特技：${p.specialty}`,
    `家族：${p.family}`,
    `経歴：${p.history}`,
    `住居：${p.residence}`,
    `普段の生活：${p.dailyLife}`,
    `話し方：${p.speech}`,
    `一人称：${p.firstPerson}`,
    "",
    "【経済】",
    `職業技能値：${jobSkill}`,
    `経済状況：${isDependent() ? "扶養・無収入" : "自活"}`,
    `月収：${incomeText(jobSkill, state.social.RNK)}`,
    `所持金：${moneyText(jobSkill, state.social.RNK)}`,
    "",
    "【備考】",
    p.notes
  ];
  return lines.join("\n");
}

function makeCocofolia() {
  // Cocofolia has 15 parameter slots. Profile/economic information goes into memo.
  const params = [
    ...ABILITIES.map(([code]) => ({label: code, value: String(state.abilities[code])})),
    {label:"SYN", value:String(state.SYN)},
    ...SKILLS.map(([code]) => ({label:code, value:String(state.skills[code])})),
    ...SOCIALS.map(([code]) => ({label:code, value:String(state.social[code])}))
  ];

  // 回避値 = DEX × 10（上限90%）。BCDiceに min() が無いため、上限に達する場合は 90 を直接指定する。
  const dodgeCommand = state.abilities.DEX * 10 >= 90
    ? `1d100<=90 【回避判定（回避率上限90%）】`
    : `1d100<={DEX}*10 【回避判定（DEX × 10）】`;

  const commands = [
    `1d100<={SAN} 【正気度ロール】`,
    dodgeCommand,
    `C({STR}/2U) 【近接攻撃補正（STR ÷ 2・切り上げ）】`,
    `C({STR}/2U) 【受身の軽減値（ダメージ − この値／回避とは併用不可）】`,
    ...SKILLS.map(([code,name]) => `CCB<={${code}} 【${name}】`),
    ...ABILITIES.map(([code]) => `CCB<={${code}}*5 【${code} × 5】`)
  ];

  return {
    kind: "character",
    data: {
      name: textValue("name") || "未設定",
      initiative: Number($("AP").textContent),
      memo: buildCocofoliaMemo(),
      externalUrl: "",
      iconUrl: "",
      commands: commands.join("\n"),
      status: [
        {label:"HP", value: Number($("HP").textContent), max: Number($("HP").textContent)},
        {label:"SAN", value: Number($("SAN").textContent), max: 100},
        {label:"汚染値", value: 0, max: 100},
        {label:"CE", value: state.CE, max: 5},
        {label:"PE", value: state.PE, max: 5}
      ],
      params
    }
  };
}

function copyText(text, message) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showStatus(message)).catch(() => fallbackCopy(text, message));
  } else {
    fallbackCopy(text, message);
  }
}

function fallbackCopy(text, message) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand("copy");
    showStatus(message);
  } catch {
    showStatus("コピーに失敗しました。");
  }
  area.remove();
}

function copyCharacterSheet() {
  copyText(buildPreview(), "キャラクターシートをコピーしました。");
}

function copyCocofoliaJson() {
  const json = JSON.stringify(makeCocofolia());
  copyText(json, "ココフォリア用JSONをコピーしました。");
}

function saveData() {
  const data = {
    version: 1,
    profile: profileData(),
    state
  };
  localStorage.setItem("futureTrpgCharacter", JSON.stringify(data));
  showStatus("キャラクターをブラウザに保存しました。");
}

function loadData() {
  const raw = localStorage.getItem("futureTrpgCharacter");
  if (!raw) {
    showStatus("保存されたキャラクターがありません。");
    return;
  }

  try {
    const data = JSON.parse(raw);
    const p = data.profile || {};
    Object.keys(p).forEach(id => {
      if ($(id)) $(id).value = p[id] ?? "";
    });

    state = data.state || state;

    ABILITIES.forEach(([code]) => $(code).value = state.abilities[code] ?? 0);
    $("SYN").value = state.SYN ?? 0;
    state.CE = state.CE ?? 3;
    state.PE = state.PE ?? 3;
    $("CE").value = state.CE;
    $("PE").value = state.PE;
    SKILLS.forEach(([code]) => $(`skill_${code}`).value = state.skills[code] ?? 0);
    SOCIALS.forEach(([code]) => $(`social_${code}`).value = state.social[code] ?? 0);

    document.querySelectorAll(".job-card").forEach(c => c.classList.toggle("selected", c.dataset.job === state.job));
    update();
    showStatus("保存したキャラクターを読み込みました。");
  } catch {
    showStatus("保存データの読み込みに失敗しました。");
  }
}

function downloadCocofolia() {
  const data = makeCocofolia();
  const json = JSON.stringify(data);
  const blob = new Blob([json], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${textValue("name") || "future-trpg-character"}_cocofolia.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("ココフォリア用JSONを1行形式で出力しました。");
}

function resetAll() {
  if (!confirm("入力中のキャラクターを新規作成状態に戻しますか？")) return;
  localStorage.removeItem("futureTrpgCharacter");
  location.reload();
}

function showStatus(text) {
  $("statusMessage").textContent = text;
  setTimeout(() => {
    if ($("statusMessage").textContent === text) $("statusMessage").textContent = "";
  }, 3000);
}

init();
