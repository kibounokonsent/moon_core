const COMPANY_TYPES = {
  RSH: {name:"研究", evolution:"ARC", evolutionName:"知恵", effect:"全研究が可能になる。SYNの増加。"},
  TAC: {name:"戦闘、防衛", evolution:"WAR", evolutionName:"軍事", effect:"国家級武装企業となる。支出増加。"},
  ENG: {name:"技術", evolution:"SYS", evolutionName:"文明", effect:"大体のことが可能になる。ファンブル域2増加。"},
  MED: {name:"医療", evolution:"LIF", evolutionName:"生命", effect:"生命関連の活動が可能になる。ETHの低下によるステータス低下増加。"},
  OPS: {name:"情報", evolution:"NEX", evolutionName:"情報", effect:"情報管理が可能になる。CI減少増加。"},
  COM: {name:"商業", evolution:"ECO", evolutionName:"経済", effect:"資金力が大幅に増加する。POWにデバフ。"}
};

let state = {
  companyName:"",
  presidentName:"",
  presidentSkill:0,
  presidentCL:1,
  presidentRNK:1,
  type:"",
  baseDice:0,
  REP:0,
  ETH:0,
  financeIncomeDice:0,
  financeExpenseDice:0,
  financeScandalDice:0,
  financeScandalLossDice:0,
  operationStatus:"active"
};

const $ = id => document.getElementById(id);
const ceil = n => Math.ceil(n);
const num = id => {
  const el = $(id);
  const n = Number(el ? el.value : 0);
  return Number.isFinite(n) ? n : 0;
};
const text = id => {
  const el = $(id);
  return el ? el.value.trim() : "";
};

function init(){
  renderTypes();
  bindInputs();
  $("operationStatus").addEventListener("change", update);
  $("rollBase").addEventListener("click", rollBase);
  $("rollFinance").addEventListener("click", rollFinance);
  $("save").addEventListener("click", saveData);
  $("load").addEventListener("click", loadData);
  $("copySheet").addEventListener("click", copySheet);
  $("copyJson").addEventListener("click", copyCocofoliaJson);
  $("downloadJson").addEventListener("click", downloadCocofolia);
  $("reset").addEventListener("click", resetAll);
  update();
}

function renderTypes(){
  $("typeGrid").innerHTML = Object.entries(COMPANY_TYPES).map(([code,data]) => `
    <div class="job-card" data-type="${code}">
      <div class="job-code">${code}</div>
      <div class="job-name">${data.name}</div>
      <div class="hint" style="margin:6px 0 0;">→ ${data.evolution} ${data.evolutionName}</div>
    </div>
  `).join("");

  document.querySelectorAll(".job-card").forEach(card => {
    card.addEventListener("click", () => {
      state.type = card.dataset.type;
      document.querySelectorAll(".job-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      update();
    });
  });
}

function bindInputs(){
  ["companyName","presidentName"].forEach(id => $(id).addEventListener("input", update));

  ["presidentSkill","presidentCL","presidentRNK"].forEach(id => {
    $(id).addEventListener("input", () => {
      const max = id === "presidentSkill" ? 99 : 10;
      const min = id === "presidentSkill" ? 0 : 1;
      const value = Math.max(min, Math.min(max, Math.floor(num(id))));
      $(id).value = value;
      update();
    });
  });

  ["REP","ETH"].forEach(id => {
    $(id).addEventListener("input", () => {
      $(id).value = Math.max(0, Math.floor(num(id)));
      update();
    });
  });
}

function rollD(sides,count){
  const rolls = [];
  let total = 0;
  for(let i=0;i<count;i++){
    const r = Math.floor(Math.random()*sides)+1;
    rolls.push(r);
    total += r;
  }
  return {rolls,total};
}

function rollBase(){
  const r = rollD(5,2);
  state.baseDice = r.total;
  state.REP = 0;
  state.ETH = 0;
  $("REP").value = 0;
  $("ETH").value = 0;
  update();
}

function baseTotal(){
  return state.baseDice ? ceil(state.presidentSkill / 10) + state.baseDice : 0;
}

function normalizeBasePoints(){
  const total = baseTotal();
  const used = state.REP + state.ETH;
  if(used <= total) return;

  // REP/ETH are a free allocation of the base points, so excess is removed.
  // This does not invent a new allocation rule; it only prevents spending
  // more than the calculated base points.
  let excess = used - total;
  const ethRemove = Math.min(state.ETH, excess);
  state.ETH -= ethRemove;
  excess -= ethRemove;
  state.REP = Math.max(0, state.REP - excess);
  $("REP").value = state.REP;
  $("ETH").value = state.ETH;
}

/* ルールブックの計算式 */
function FUN(){
  // REPで上昇、ETHで低下（ブラック企業ほど資金力が高く、ホワイト企業ほど低い）
  return ceil(5 + ((state.REP - state.ETH) / 2));
}

function typePoints(){
  // 設立直後の目安は0〜24程度（職業技能が高い社長のみ30前後まで）。0未満にはならない
  return Math.max(0, ceil(state.presidentSkill / 5) + FUN());
}

function INF(){
  return ceil(typePoints() / 10) + ceil(state.REP / 2);
}

function CL(){
  return ceil(state.presidentCL / 2) + ceil(state.ETH / 2);
}

function RNK(){
  return ceil(state.presidentRNK / 2) + ceil(CL() / 2);
}

function statusWarning(){
  const out = [];
  [["FUN",FUN()],["INF",INF()],["CL",CL()],["RNK",RNK()]].forEach(([name,value]) => {
    if(value < 1 || value > 10) out.push(`${name}=${value}`);
  });
  return out;
}

function operationStatus(){
  const el = $("operationStatus");
  return el ? el.value : "active";
}

function isSuspended(){
  return operationStatus() === "suspended";
}

function rollFinance(){
  // rollD() は {rolls, total} を返すので、合計値(total)だけを保存する
  const income = rollD(10, Math.max(0, FUN()));
  const expense = rollD(10, 10);
  state.financeIncomeDice = income.total;
  state.financeExpenseDice = expense.total;
  // 不祥事判定（1D10）と、発生時の規模（1D10）。発生の有無は現在のETHで判定する
  state.financeScandalDice = rollD(10, 1).total;
  state.financeScandalLossDice = rollD(10, 1).total;
  update();
}

/* FUNとCLが両方0だと収入が事故的に0になるため、+1のベースラインを乗せる。
   「休業中」はダイス運とは別に、プレイヤーが意図的に選ぶ経営状態として0円にする。 */
function incomeValue(){
  if(!state.financeIncomeDice) return 0;
  if(isSuspended()) return 0;
  const base = ((state.financeIncomeDice * 10) * ((FUN() * 4 * 10) + (CL() * 10) + 1)) * 100;
  return Math.floor(base * (100 - scandalRate()) / 100);
}

/* 不祥事判定：ETHが低いほど不祥事が起きやすい。
   1D10 ≦ (4 − ETH) で発生（ETH4以上は発生しない）。
   発生した場合、さらに1D10 × 10% だけ収入が減る（出目10で収入0円）。 */
function scandalThreshold(){
  return Math.max(0, 4 - state.ETH);
}

function scandalOccurred(){
  return state.financeScandalDice > 0 && state.financeScandalDice <= scandalThreshold();
}

function scandalRate(){
  return scandalOccurred() ? Math.min(100, state.financeScandalLossDice * 10) : 0;
}

function scandalText(){
  if(!state.financeScandalDice) return "未判定";
  return scandalOccurred() ? `発生 −${scandalRate()}%` : "なし";
}

function scandalDetail(){
  if(!state.financeScandalDice) return "未判定";
  const th = scandalThreshold();
  if(th === 0) return "なし（ETH4以上のため不祥事は発生しない）";
  return scandalOccurred()
    ? `発生（1D10=${state.financeScandalDice} ≦ ${th}／規模1D10=${state.financeScandalLossDice} → 収入−${scandalRate()}%）`
    : `なし（1D10=${state.financeScandalDice} > ${th}）`;
}

function expenseValue(){
  if(!state.financeExpenseDice) return 0;
  const social = ((INF() + RNK() + state.REP + state.ETH) / 4) * 10;
  return ((state.financeExpenseDice * 10) * (typePoints() + social)) * 100;
}

function update(){
  // 会社名・社長名も入力欄からstateへ読み込む（保存・プレビュー・ココフォリア出力に使うため）
  state.companyName = text("companyName");
  state.presidentName = text("presidentName");
  state.presidentSkill = Math.max(0, Math.min(99, Math.floor(num("presidentSkill"))));
  state.presidentCL = Math.max(1, Math.min(10, Math.floor(num("presidentCL"))));
  state.presidentRNK = Math.max(1, Math.min(10, Math.floor(num("presidentRNK"))));
  state.REP = Math.max(0, Math.floor(num("REP")));
  state.ETH = Math.max(0, Math.floor(num("ETH")));
  state.operationStatus = operationStatus();

  normalizeBasePoints();

  const total = baseTotal();
  const tp = typePoints();
  const data = state.type ? COMPANY_TYPES[state.type] : null;
  const warning = statusWarning();

  $("baseDice").textContent = state.baseDice || "未決定";
  $("baseTotal").textContent = total;
  $("baseRemaining").textContent = Math.max(0,total-state.REP-state.ETH);

  $("selectedType").textContent = state.type ? `${state.type} ${data.name}` : "未選択";
  $("typeCode").textContent = state.type || "未選択";
  $("skillHalf").textContent = ceil(state.presidentSkill/5);
  $("funBonus").textContent = FUN();
  $("typePoints").textContent = tp;
  $("evolution").textContent = data && tp >= 100
    ? `${data.evolution} ${data.evolutionName}`
    : "通常";

  $("companyCL").textContent = CL();
  $("companyINF").textContent = INF();
  $("companyRNK").textContent = RNK();
  $("companyFUN").textContent = FUN();

  $("incomeDice").textContent = state.financeIncomeDice ? state.financeIncomeDice : "未決定";
  $("scandal").textContent = scandalText();
  $("expenseDice").textContent = state.financeExpenseDice ? state.financeExpenseDice : "未決定";
  $("income").textContent = !state.financeIncomeDice ? "0円" : isSuspended() ? "0円（休業中）" : `${incomeValue().toLocaleString()}円`;
  $("expense").textContent = state.financeExpenseDice ? `${expenseValue().toLocaleString()}円` : "0円";
  $("balance").textContent = state.financeIncomeDice && state.financeExpenseDice
    ? `${(incomeValue()-expenseValue()).toLocaleString()}円`
    : "0円";

  const warningEl = $("ruleWarning");
  if(warningEl){
    warningEl.textContent = warning.length
      ? `会社ステータス1～10の範囲外：${warning.join("、")}`
      : "";
  }

  document.querySelectorAll(".job-card").forEach(c =>
    c.classList.toggle("selected", c.dataset.type === state.type)
  );

  $("preview").textContent = buildPreview();
}

function buildPreview(){
  const total = baseTotal();
  const tp = typePoints();
  const data = state.type ? COMPANY_TYPES[state.type] : null;

  return [
    "未来世界 TRPG",
    "COMPANY SHEET",
    "",
    "【会社情報】",
    `会社名：${state.companyName}`,
    `社長：${state.presidentName}`,
    `社長の職業技能値：${state.presidentSkill}`,
    `企業タイプ：${state.type ? state.type+" "+data.name : "未選択"}`,
    `進化先：${state.type ? data.evolution+" "+data.evolutionName : "未選択"}`,
    "",
    "【会社ステータス】",
    `CL 信用：${CL()}`,
    `INF 影響：${INF()}`,
    `RNK 権力：${RNK()}`,
    `FUN 資金力：${FUN()}`,
    `REP 企業評価、貢献度：${state.REP}`,
    `ETH 企業倫理：${state.ETH}`,
    "",
    "【基礎ポイント】",
    `2D5：${state.baseDice || "未決定"}`,
    `基礎ポイント：${total}`,
    "",
    "【企業タイプポイント】",
    `企業タイプポイント：${tp}`,
    `進化状態：${state.type && tp >= 100 ? data.evolution+" "+data.evolutionName : "通常"}`,
    "",
    "【財務】",
    `運営状況：${isSuspended() ? "休業中" : "通常稼働"}`,
    `収入ダイス：${state.financeIncomeDice || "未決定"}`,
    `収入：${$("income").textContent}`,
    `不祥事判定：${scandalDetail()}`,
    `支出ダイス：${state.financeExpenseDice || "未決定"}`,
    `支出：${state.financeExpenseDice ? expenseValue().toLocaleString()+"円" : "0円"}`,
    `差額：${state.financeIncomeDice && state.financeExpenseDice ? (incomeValue()-expenseValue()).toLocaleString()+"円" : "0円"}`,
    "",
    "【企業タイプ効果】",
    data ? data.effect : "未選択"
  ].join("\n");
}

function saveData(){
  localStorage.setItem("futureWorldCompanySheet",JSON.stringify(state));
  showStatus("会社データを保存しました。");
}

function loadData(){
  const raw = localStorage.getItem("futureWorldCompanySheet");
  if(!raw){ showStatus("保存データがありません。"); return; }
  try{
    state = Object.assign({
      companyName:"",presidentName:"",presidentSkill:0,presidentCL:1,presidentRNK:1,
      type:"",baseDice:0,REP:0,ETH:0,financeIncomeDice:0,financeExpenseDice:0,financeScandalDice:0,financeScandalLossDice:0,
      operationStatus:"active"
    },JSON.parse(raw));

    // 旧バグで {rolls,total} のまま保存されたデータを数値に直す
    ["financeIncomeDice","financeExpenseDice","financeScandalDice","financeScandalLossDice"].forEach(k => {
      const v = state[k];
      state[k] = (v && typeof v === "object") ? (Number(v.total) || 0) : (Number(v) || 0);
    });

    $("companyName").value = state.companyName || "";
    $("presidentName").value = state.presidentName || "";
    $("presidentSkill").value = state.presidentSkill ?? 0;
    $("presidentCL").value = state.presidentCL ?? 1;
    $("presidentRNK").value = state.presidentRNK ?? 1;
    $("REP").value = state.REP ?? 0;
    $("ETH").value = state.ETH ?? 0;
    $("operationStatus").value = state.operationStatus || "active";
    update();
    showStatus("保存データを読み込みました。");
  }catch{
    showStatus("保存データの読み込みに失敗しました。");
  }
}

function buildCocofoliaMemo(){
  const data = state.type ? COMPANY_TYPES[state.type] : null;
  return [
    "【会社情報】",
    `会社名：${state.companyName || "未設定"}`,
    `社長：${state.presidentName || "未設定"}`,
    `社長の職業技能値：${state.presidentSkill}`,
    `企業タイプ：${state.type ? state.type+" "+data.name : "未選択"}`,
    "",
    "【会社ステータス】",
    `CL 信用：${CL()}`,
    `INF 影響：${INF()}`,
    `RNK 権力：${RNK()}`,
    `FUN 資金力：${FUN()}`,
    `REP 企業評価、貢献度：${state.REP}`,
    `ETH 企業倫理：${state.ETH}`,
    "",
    "【基礎ポイント】",
    `2D5：${state.baseDice || "未決定"}`,
    `基礎ポイント：${baseTotal()}`,
    "",
    "【企業タイプポイント】",
    `企業タイプポイント：${typePoints()}`,
    `進化状態：${state.type && typePoints() >= 100 ? data.evolution+" "+data.evolutionName : "通常"}`,
    "",
    "【財務】",
    `運営状況：${isSuspended() ? "休業中" : "通常稼働"}`,
    `収入：${state.financeIncomeDice ? (isSuspended() ? "0円（休業中）" : incomeValue().toLocaleString()+"円") : "未計算"}`,
    `不祥事判定：${scandalDetail()}`,
    `支出：${state.financeExpenseDice ? expenseValue().toLocaleString()+"円" : "未計算"}`,
    `差額：${state.financeIncomeDice && state.financeExpenseDice ? (incomeValue()-expenseValue()).toLocaleString()+"円" : "未計算"}`,
    "",
    "【企業タイプ効果】",
    data ? data.effect : "未選択"
  ].join("\n");
}

function makeCocofolia(){
  const tp = typePoints();
  const commands = [
    "CCB<={CL} 【会社信用】",
    "CCB<={INF} 【会社影響】",
    "CCB<={RNK} 【会社権力】",
    "CCB<={企業タイプ} 【企業タイプ】"
  ];

  return {
    kind:"character",
    data:{
      name:state.companyName || "未設定",
      initiative:RNK(),
      memo:buildCocofoliaMemo(),
      externalUrl:"",
      iconUrl:"",
      commands:commands.join("\n"),
      status:[
        {label:"資金",value:0,max:0},
        {label:"REP",value:state.REP,max:10},
        {label:"ETH",value:state.ETH,max:10},
        {label:"企業タイプPt",value:tp,max:100},
        {label:"収支",value:state.financeIncomeDice && state.financeExpenseDice ? incomeValue()-expenseValue() : 0,max:0}
      ],
      params:[
        {label:"CL",value:String(CL())},
        {label:"INF",value:String(INF())},
        {label:"RNK",value:String(RNK())},
        {label:"FUN",value:String(FUN())},
        {label:"REP",value:String(state.REP)},
        {label:"ETH",value:String(state.ETH)},
        {label:"企業タイプ",value:String(tp)},
        {label:"企業タイプPt",value:String(tp)},
        {label:"社長技能",value:String(state.presidentSkill)}
      ]
    }
  };
}

function copyCocofoliaJson(){
  copyText(JSON.stringify(makeCocofolia()),"ココフォリア用会社駒JSONをコピーしました。");
}

function downloadCocofolia(){
  const json = JSON.stringify(makeCocofolia());
  const blob = new Blob([json],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download=`${state.companyName || "company"}_cocofolia.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showStatus("ココフォリア用会社駒JSONを出力しました。");
}

function copySheet(){ copyText(buildPreview(),"会社シートをコピーしました。"); }

function copyText(value,message){
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(value).then(()=>showStatus(message)).catch(()=>fallbackCopy(value,message));
  }else fallbackCopy(value,message);
}

function fallbackCopy(value,message){
  const area=document.createElement("textarea");
  area.value=value;
  area.style.position="fixed";
  area.style.left="-9999px";
  document.body.appendChild(area);
  area.select();
  try{ document.execCommand("copy"); showStatus(message); }
  catch{ showStatus("コピーに失敗しました。"); }
  area.remove();
}

function resetAll(){
  if(!confirm("会社シートを新規作成しますか？")) return;
  state={
    companyName:"",presidentName:"",presidentSkill:0,presidentCL:1,presidentRNK:1,
    type:"",baseDice:0,REP:0,ETH:0,financeIncomeDice:0,financeExpenseDice:0,financeScandalDice:0,financeScandalLossDice:0,
    operationStatus:"active"
  };
  $("companyName").value="";
  $("presidentName").value="";
  $("presidentSkill").value=0;
  $("presidentCL").value=1;
  $("presidentRNK").value=1;
  $("REP").value=0;
  $("ETH").value=0;
  $("operationStatus").value="active";
  update();
  showStatus("新規会社シートを作成しました。");
}

function showStatus(message){ $("statusMessage").textContent=message; }

document.addEventListener("DOMContentLoaded",init);
