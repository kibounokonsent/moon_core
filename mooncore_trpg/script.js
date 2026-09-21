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

const HP_MAX = 40;
const SAN_MAX = 100;
const SAVE_FORMAT = "MOON_CORE_CHARACTER";
const CAMPAIGN_KEY = "futureTrpgCampaign";

function makeDefaultState() {
  return {
    diceTotal: 0,
    abilities: {STR:0, DEX:0, CON:0, INT:0, POW:0},
    job: "",
    skills: {RSH:0, TAC:0, ENG:0, MED:0, OPS:0, CWD:0},
    growth: {
      abilities: {STR:0, DEX:0, CON:0, INT:0, POW:0},
      skills: {RSH:0, TAC:0, ENG:0, MED:0, OPS:0, CWD:0},
      HP: 0,
      SAN: 0
    },
    contamination: 0,
    passive: {name: "", effect: ""},
    relationships: [],
    social: {CL:0, RNK:0, INF:0},
    SYN: 0,
    CE: 3,
    PE: 3
  };
}

let state = makeDefaultState();

// プレイヤー共有の情報（キャラクターではなくプレイヤーが所持する）
let campaign = { growthPoints: 0 };

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
  renderGrowth();
  renderSocial();
  bindProfile();
  $("economicStatus").addEventListener("change", update);
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
  $("SYN").addEventListener("input", () => {
    state.SYN = clampInt(numberValue("SYN"), 0, 20);
    update();
  });
  $("SYN").addEventListener("change", () => { $("SYN").value = state.SYN; });
  $("passiveName").addEventListener("input", () => { state.passive.name = $("passiveName").value; update(); });
  $("passiveEffect").addEventListener("input", () => { state.passive.effect = $("passiveEffect").value; update(); });
  $("addRelation").addEventListener("click", () => {
    state.relationships.push({target: "", value: ""});
    renderRelationships();
    update();
  });
  renderRelationships();
  $("rollDice").addEventListener("click", rollDice);
  $("save").addEventListener("click", saveData);
  $("load").addEventListener("click", loadData);
  $("copySheet").addEventListener("click", copyCharacterSheet);
  $("copyJson").addEventListener("click", copyCocofoliaJson);
  $("downloadJson").addEventListener("click", downloadCocofolia);
  $("reset").addEventListener("click", resetAll);
  $("exportSave").addEventListener("click", exportSaveJson);
  $("importSave").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", importSaveJson);
  $("growthPoints").addEventListener("input", () => {
    campaign.growthPoints = clampInt(numberValue("growthPoints"), 0, 99999);
    saveCampaign();
    update(); // GROWTH欄の表示も同時に更新する
  });
  $("growthPoints").addEventListener("change", () => {
    $("growthPoints").value = campaign.growthPoints;
  });
  loadCampaign();
  update();
}

function renderAbilities() {
  $("abilityGrid").innerHTML = ABILITIES.map(([code, name]) => `
    <tr>
      <th class="row-label"><strong>${code}</strong><span>${name}</span></th>
      <td><input id="${code}" type="number" min="0" max="20" value="0"></td>
      <td><input id="growth_ability_${code}" type="number" min="0" max="20" value="0"></td>
      <td><strong id="current_ability_${code}">0</strong></td>
    </tr>
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
    <tr>
      <th class="row-label"><strong>${code}</strong><span>${name}</span></th>
      <td><input id="skill_${code}" type="number" min="0" max="99" value="0"></td>
      <td><input id="growth_skill_${code}" type="number" min="0" max="99" value="0"></td>
      <td><strong id="current_skill_${code}">0</strong></td>
    </tr>
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

function renderGrowth() {
  // 成長値の入力欄は ABILITY / SKILLS / STATUS の表の中にある。ここでは入力の処理だけを結び付ける
  ABILITIES.forEach(([code]) => {
    $(`growth_ability_${code}`).addEventListener("input", () => {
      setGrowthAbility(code, numberValue(`growth_ability_${code}`));
      update();
    });
  });
  SKILLS.forEach(([code]) => {
    $(`growth_skill_${code}`).addEventListener("input", () => {
      setGrowthSkill(code, numberValue(`growth_skill_${code}`));
      update();
    });
  });
  $("growthHP").addEventListener("input", () => {
    setGrowthHP(numberValue("growthHP"));
    update();
  });
  $("growthSAN").addEventListener("input", () => {
    setGrowthSAN(numberValue("growthSAN"));
    update();
  });
}

function growthCost(g = state.growth) {
  const ability = Object.values(g.abilities || {}).reduce((a,b)=>a + Math.max(0, Number(b)||0), 0) * 3;
  const skill = Object.values(g.skills || {}).reduce((a,b)=>a + Math.max(0, Number(b)||0), 0);
  return ability + skill + Math.max(0, Number(g.HP)||0) + Math.max(0, Number(g.SAN)||0);
}

function setGrowthValue(path, requested, max) {
  const g = state.growth;
  const parts = path.split(".");
  let target = g;
  for (let i=0; i<parts.length-1; i++) target = target[parts[i]];
  const key = parts[parts.length-1];
  const old = Number(target[key]) || 0;
  const unit = parts[0] === "abilities" ? 3 : 1; // 能力値+1は3、それ以外は1
  let value = clampInt(requested, 0, max);

  // 使用可能な成長値の範囲までに収める
  const available = Math.max(0, campaign.growthPoints - growthCost());
  const affordable = old + Math.floor(available / unit);
  if (value > affordable) {
    value = affordable;
    showStatus("使用可能な成長値が足りないため、使える分までに調整しました。");
  }
  target[key] = value;
  $(parts[0] === "abilities" ? `growth_ability_${key}` : parts[0] === "skills" ? `growth_skill_${key}` : `growth${key}`).value = value;
}

function setGrowthAbility(code, value) {
  const max = Math.max(0, 20 - state.abilities[code]);
  setGrowthValue(`abilities.${code}`, value, max);
}
function setGrowthSkill(code, value) {
  const max = Math.max(0, 99 - state.skills[code]);
  setGrowthValue(`skills.${code}`, value, max);
}
function setGrowthHP(value) {
  setGrowthValue("HP", value, Math.max(0, HP_MAX - state.abilities.CON * 2));
}
function setGrowthSAN(value) {
  const max = Math.max(0, SAN_MAX - state.abilities.POW * 10);
  setGrowthValue("SAN", value, max);
}

function renderSocial() {
  $("socialGrid").innerHTML = SOCIALS.map(([code, name]) => `
    <tr>
      <th class="row-label"><strong>${code}</strong><span>${name}</span></th>
      <td><input id="social_${code}" type="number" min="0" value="0"></td>
    </tr>
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
  state.growth = makeDefaultState().growth;
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


function normalizeGrowthToCaps() {
  for (const [code] of ABILITIES) {
    state.growth.abilities[code] = clampInt(state.growth.abilities[code] || 0, 0, Math.max(0, 20 - state.abilities[code]));
  }
  for (const [code] of SKILLS) {
    state.growth.skills[code] = clampInt(state.growth.skills[code] || 0, 0, Math.max(0, 99 - state.skills[code]));
  }
  state.growth.HP = clampInt(state.growth.HP || 0, 0, Math.max(0, HP_MAX - state.abilities.CON * 2));
  state.growth.SAN = clampInt(state.growth.SAN || 0, 0, Math.max(0, SAN_MAX - state.abilities.POW * 10));
}

function update() {
  state.abilities = Object.fromEntries(ABILITIES.map(([code]) => [code, clampInt(numberValue(code),0,20)]));
  // 表示・入力はSYN（0～20）。内部の汚染値は「次のシナリオ開始時の汚染値 = SYN×5」として保持する
  state.SYN = clampInt(state.SYN, 0, 20);
  state.contamination = state.SYN * 5;
  $("nextContamination").textContent = state.contamination;
  normalizeGrowthToCaps();

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
  const currentAbilities = Object.fromEntries(ABILITIES.map(([code]) => [code, state.abilities[code] + (state.growth.abilities[code] || 0)]));
  const currentSkills = Object.fromEntries(SKILLS.map(([code]) => [code, state.skills[code] + (state.growth.skills[code] || 0)]));
  const maxHP = Math.min(HP_MAX, CON * 2 + (state.growth.HP || 0));
  const maxSAN = Math.min(SAN_MAX, POW * 10 + (state.growth.SAN || 0));

  $("HP").textContent = maxHP;
  $("SAN").textContent = maxSAN;
  $("AP").textContent = ceil(DEX / 2);
  $("income").textContent = incomeText(jobSkill, RNK);
  $("money").textContent = moneyText(jobSkill, RNK);
  $("growthUsed").textContent = growthCost();
  $("growthRemaining").textContent = Math.max(0, campaign.growthPoints - growthCost());
  $("base_HP").textContent = CON * 2;
  $("base_SAN").textContent = Math.min(SAN_MAX, POW * 10);
  $("current_HP").textContent = maxHP;
  $("current_SAN").textContent = maxSAN;
  $("current_AP").textContent = $("AP").textContent;
  ABILITIES.forEach(([code]) => { $("current_ability_" + code).textContent = currentAbilities[code]; });
  SKILLS.forEach(([code]) => { $("current_skill_" + code).textContent = currentSkills[code]; });
  $("growthHP").value = state.growth.HP || 0;
  $("growthSAN").value = state.growth.SAN || 0;

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

function passiveLines() {
  return ["【パッシブ】", `パッシブ名：${state.passive.name.trim()}`, `効果：${state.passive.effect.trim()}`];
}

function relationLines() {
  return [
    "【関係値】",
    ...state.relationships
      .filter(r => r.target.trim() || r.value.trim())
      .map(r => `${r.target.trim()}：${r.value.trim()}`)
  ];
}

function renderRelationships() {
  const box = $("relationList");
  box.innerHTML = "";
  state.relationships.forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "relation-row";
    const target = document.createElement("input");
    target.placeholder = "相手／対象";
    target.value = r.target;
    target.addEventListener("input", () => { state.relationships[i].target = target.value; update(); });
    const value = document.createElement("input");
    value.placeholder = "関係値";
    value.value = r.value;
    value.addEventListener("input", () => { state.relationships[i].value = value.value; update(); });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "secondary";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      state.relationships.splice(i, 1);
      renderRelationships();
      update();
    });
    row.append(target, value, del);
    box.append(row);
  });
}

function normalizePassive(p) {
  if (p && typeof p === "object") return {name: String(p.name || ""), effect: String(p.effect || "")};
  const s = String(p || "").trim();
  if (!s) return {name: "", effect: ""};
  // 旧形式（1つの文字列）：短ければパッシブ名、長ければ効果として読み込む
  return (s.length <= 20 && !s.includes("\n")) ? {name: s, effect: ""} : {name: "", effect: s};
}

function normalizeRelationships(r) {
  if (!Array.isArray(r)) return [];
  return r
    .map(x => (x && typeof x === "object")
      ? {target: String(x.target || ""), value: String(x.value || "")}
      : {target: String(x || ""), value: ""})
    .filter(x => x.target || x.value);
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
    ...ABILITIES.map(([code]) => `${code}：${state.abilities[code] + (state.growth.abilities[code] || 0)}（元の値 ${state.abilities[code]} ＋ 成長値 ${state.growth.abilities[code] || 0}）`),
    `SYN：${state.SYN}`,
    "",
    "【職業・技能】",
    `職業技能：${state.job ? state.job + " " + JOBS[state.job] : "未選択"}`,
    `作成時の職業技能値：${jobSkill}`,
    ...SKILLS.map(([code,name]) => `${code} ${name}：${state.skills[code] + (state.growth.skills[code] || 0)}（元の値 ${state.skills[code]} ＋ 成長値 ${state.growth.skills[code] || 0}）`),
    "",
    "【社会】",
    ...SOCIALS.map(([code,name]) => `${code} ${name}：${state.social[code]}`),
    "",
    "【計算値】",
    `HP：${$("HP").textContent}（元の値 ${state.abilities.CON * 2} ＋ 成長値 ${state.growth.HP || 0}）`,
    `SAN：${$("SAN").textContent}（元の値 ${Math.min(SAN_MAX, state.abilities.POW * 10)} ＋ 成長値 ${state.growth.SAN || 0}）`,
    `AP：${$("AP").textContent}`,
    `CE：${state.CE}`,
    `PE：${state.PE}`,
    `経済状況：${isDependent() ? "扶養・無収入" : "自活"}`,
    `月収：${incomeText(jobSkill, state.social.RNK)}`,
    `所持金：${moneyText(jobSkill, state.social.RNK)}`,
    "",
    ...passiveLines(),
    "",
    ...relationLines(),
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
    `作成時の職業技能値：${jobSkill}`,
    `経済状況：${isDependent() ? "扶養・無収入" : "自活"}`,
    `月収：${incomeText(jobSkill, state.social.RNK)}`,
    `所持金：${moneyText(jobSkill, state.social.RNK)}`,
    "",
    ...passiveLines(),
    "",
    ...relationLines(),
    "",
    "【備考】",
    p.notes
  ];
  return lines.join("\n");
}

function makeCocofolia() {
  // Cocofolia has 15 parameter slots. Profile/economic information goes into memo.
  const params = [
    ...ABILITIES.map(([code]) => ({label: code, value: String(state.abilities[code] + (state.growth.abilities[code] || 0))})),
    {label:"SYN", value:String(state.SYN)},
    ...SKILLS.map(([code]) => ({label:code, value:String(state.skills[code] + (state.growth.skills[code] || 0))})),
    ...SOCIALS.map(([code]) => ({label:code, value:String(state.social[code])}))
  ];

  // 回避値：遠距離攻撃 = DEX × 10、近距離攻撃 = DEX × 5（いずれも上限90%）。
  // BCDiceに min() が無いため、上限に達する場合は 90 を直接指定する。
  const currentDEX = state.abilities.DEX + (state.growth.abilities.DEX || 0);
  const dodgeFar = currentDEX * 10 >= 90
    ? `CCB<=90 【回避判定・遠距離攻撃（回避率上限90%）】`
    : `CCB<={DEX}*10 【回避判定・遠距離攻撃（DEX × 10）】`;
  const dodgeNear = currentDEX * 5 >= 90
    ? `CCB<=90 【回避判定・近距離攻撃（回避率上限90%）】`
    : `CCB<={DEX}*5 【回避判定・近距離攻撃（DEX × 5）】`;

  const commands = [
    `CCB<={SAN} 【正気度ロール】`,
    dodgeFar,
    dodgeNear,
    `C({STR}/2U) 【近接攻撃補正（STR ÷ 2・切り上げ）】`,
    `C({STR}/2U) 【受身の軽減値・近距離攻撃（ダメージ − この値、最低1／回避とは併用不可）】`,
    `C({STR}/4U) 【受身の軽減値・遠距離攻撃（ダメージ − この値、最低1／回避とは併用不可）】`,
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
        {label:"SAN", value: Number($("SAN").textContent), max: Number($("SAN").textContent)},
        {label:"汚染値", value: state.contamination, max: 100},
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
    applyCharacterData(JSON.parse(raw));
    showStatus("保存したキャラクターを読み込みました。");
  } catch {
    showStatus("保存データの読み込みに失敗しました。");
  }
}

// 保存データ（ブラウザ保存・保存用JSON共通）からキャラクターを復元する
function applyCharacterData(data) {
  const p = data.profile || {};
  Object.keys(p).forEach(id => {
    if ($(id)) $(id).value = p[id] ?? "";
  });

  const base = makeDefaultState();
  const src = data.state || {};
  state = {
    ...base,
    ...src,
    abilities: {...base.abilities, ...(src.abilities || {})},
    skills: {...base.skills, ...(src.skills || {})},
    social: {...base.social, ...(src.social || {})},
    growth: {
      ...base.growth,
      ...(src.growth || {}),
      abilities: {...base.growth.abilities, ...((src.growth && src.growth.abilities) || {})},
      skills: {...base.growth.skills, ...((src.growth && src.growth.skills) || {})}
    },
    // SYNと汚染値は同じ値。保存データに両方ある場合は、値が小さくならないよう大きいほうを採用する
    SYN: clampInt(Math.max(Number(src.SYN) || 0, ceil((Number(src.contamination) || 0) / 5)), 0, 20),
    contamination: 0,
    passive: normalizePassive(src.passive),
    relationships: normalizeRelationships(src.relationships)
  };

  ABILITIES.forEach(([code]) => $(code).value = state.abilities[code] ?? 0);
  state.CE = state.CE ?? 3;
  state.PE = state.PE ?? 3;
  $("CE").value = state.CE;
  $("PE").value = state.PE;
  SKILLS.forEach(([code]) => $(`skill_${code}`).value = state.skills[code] ?? 0);
  SOCIALS.forEach(([code]) => $(`social_${code}`).value = state.social[code] ?? 0);
  ABILITIES.forEach(([code]) => $(`growth_ability_${code}`).value = state.growth.abilities[code] ?? 0);
  SKILLS.forEach(([code]) => $(`growth_skill_${code}`).value = state.growth.skills[code] ?? 0);
  $("growthHP").value = state.growth.HP ?? 0;
  $("growthSAN").value = state.growth.SAN ?? 0;
  $("SYN").value = state.SYN;
  $("passiveName").value = state.passive.name;
  $("passiveEffect").value = state.passive.effect;
  renderRelationships();

  document.querySelectorAll(".job-card").forEach(c => c.classList.toggle("selected", c.dataset.job === state.job));
  update();
}

/* ===== プレイヤー共有情報（成長値） ===== */
function loadCampaign() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      campaign.growthPoints = clampInt(Number(c.growthPoints) || 0, 0, 99999);
    }
  } catch {
    campaign.growthPoints = 0;
  }
  $("growthPoints").value = campaign.growthPoints;
}

function saveCampaign() {
  try {
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
  } catch {
    showStatus("成長値をブラウザに保存できませんでした。");
  }
}

/* ===== 保存用JSON（MOON COREで復元するためのJSON） ===== */

function buildSaveData() {
  return {
    format: SAVE_FORMAT,
    version: 3,
    exportedAt: new Date().toISOString(),
    profile: profileData(),
    state,
    campaign: { growthPoints: campaign.growthPoints }
  };
}

function exportSaveJson() {
  const json = JSON.stringify(buildSaveData(), null, 2);
  const blob = new Blob([json], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${textValue("name") || "moon-core-character"}_save.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("保存用JSONを出力しました。");
}

function importSaveJson(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch {
      showStatus("保存用JSONの読み込みに失敗しました。");
      return;
    }
    if (!data || data.format !== SAVE_FORMAT || !data.state) {
      showStatus("MOON COREの保存用JSONではありません。");
      return;
    }
    if (!confirm("現在入力中のキャラクターは、保存用JSONの内容で置き換えられます。よろしいですか？")) return;

    try {
      applyCharacterData(data);
    } catch {
      showStatus("保存用JSONの読み込みに失敗しました。");
      return;
    }

    // 成長値はプレイヤー共有。JSON内の値が現在と異なる場合は、置き換えるか確認する
    normalizeGrowthToCaps();
    const saved = data.campaign && Number(data.campaign.growthPoints);
    if (Number.isFinite(saved)) {
      const minimum = growthCost();
      if (saved < minimum) {
        campaign.growthPoints = minimum;
        $("growthPoints").value = campaign.growthPoints;
        saveCampaign();
      } else if (saved !== campaign.growthPoints &&
          confirm(`プレイヤーの成長値を保存用JSONの値（${saved}）に変更しますか？\n「キャンセル」で現在の成長値（${campaign.growthPoints}）を保持します。`)) {
        campaign.growthPoints = clampInt(saved, 0, 99999);
        $("growthPoints").value = campaign.growthPoints;
        saveCampaign();
      }
    }
    update();
    showStatus("保存用JSONからキャラクターを復元しました。");
  };
  reader.onerror = () => showStatus("保存用JSONの読み込みに失敗しました。");
  reader.readAsText(file);
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
  const msg = [
    `プレイヤーの成長値（${campaign.growthPoints}）は、新しいキャラクターへそのまま引き継がれます。`,
    `このキャラクターで使用した成長値（${growthCost()}）は、このキャラクターの成長として記録されます。`,
    "現在のキャラクターを残したい場合は、先に保存用JSONを出力してください。",
    "",
    "入力中のキャラクターを新規作成状態に戻しますか？"
  ].join("\n");
  if (!confirm(msg)) return;
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
