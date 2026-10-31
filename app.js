/*ENGINE-START*/
const PTL = (() => {
  const fmt = (w, d) => `${w}+${d}`;

  // NICE NG25 (2022): offer 24+0–33+6, consider 22+0–23+6 and 34+0–35+6; ACOG: single late-preterm course 34+0–36+6.
  function steroids(ga, resus) {
    if (ga < 22) return '未達 22 週：不建議產前類固醇。';
    if (ga < 24) return resus === 'yes'
      ? '產前類固醇：22+0–23+6 週且計畫積極新生兒復甦時可考慮（NICE consider；SMFM #71）。'
      : '產前類固醇：22+0–23+6 週僅在家庭與團隊選擇積極新生兒復甦後才考慮。';
    if (ga < 34) return '產前類固醇：24+0–33+6 週建議提供（NICE offer；ACOG）。';
    if (ga < 36) return '晚期早產類固醇：NICE 34+0–35+6 週可考慮；ACOG 34+0–36+6 週若 7 天內可能生產且未曾用過可給單一療程（孕前糖尿病避免）。';
    if (ga < 37) return '晚期早產類固醇：ACOG 34+0–36+6 週若 7 天內可能生產且未曾用過可給單一療程；NICE 36 週後不建議。';
    return null;
  }

  // NICE NG25: magnesium sulfate for neuroprotection when birth expected within 24 h.
  function magnesium(ga, resus) {
    if (ga < 23) return null;
    if (ga < 24) return resus === 'yes' ? '硫酸鎂神經保護：計畫積極復甦的周邊期可個別討論（ACOG/SMFM）。' : null;
    if (ga < 30) return '若已臨產或預計 24 小時內生產：24+0–29+6 週建議硫酸鎂神經保護（NICE offer）。';
    if (ga < 34) return '若已臨產或預計 24 小時內生產：30+0–33+6 週可考慮硫酸鎂神經保護（NICE consider；ACOG 至 <32 週）。';
    return null;
  }

  function assess(raw) {
    const week = Number(raw.week), day = Number(raw.day);
    if (!Number.isInteger(week) || !Number.isInteger(day) || week < 16 || week > 42 || day < 0 || day > 6 || raw.week === '' || raw.day === '') {
      return { ok: false, title: '請檢查孕週輸入', points: ['孕週請輸入 16–42 週的整數，天數 0–6。'], tone: 'warn' };
    }
    const ga = week + day / 7;
    const label = fmt(week, day);
    const s = raw.scenario;
    const infection = !!raw.infection, bleeding = !!raw.bleeding, distress = !!raw.distress, labour = !!raw.labour;
    const multiple = !!raw.multiple;
    const resus = raw.resus || 'undecided';
    const len = raw.length === '' || raw.length == null ? null : Number(raw.length);
    const points = [], alerts = [];
    let title = '';
    const add = x => { if (x) points.push(x); };

    if (infection) alerts.push('疑似羊膜內感染：給予廣效抗生素並評估分娩，不以期待處置、抑制宮縮或環紮延長妊娠。');
    if (bleeding) alerts.push('明顯出血：評估胎盤早剝／前置胎盤與母體血行動力學；抑制宮縮與緊急環紮皆不適用。');
    if (distress) alerts.push('胎兒窘迫：依產科評估加速分娩，不為延長妊娠延誤處置。');
    if (labour && s !== 'labour') alerts.push('已臨產：不進行環紮或延長妊娠的期待策略；依孕週準備早產兒照護。');
    const urgent = alerts.length > 0;
    const noDelay = infection || bleeding || distress;

    if (s === 'pprom') {
      if (ga >= 37) {
        title = '足月破水：循足月 PROM 流程';
        add('評估 GBS 狀態、感染與胎兒狀態，討論引產時機（足月 PROM 另依院內流程）。');
      } else if (ga >= 34) {
        title = '34+0–36+6 週 PPROM：共同決策生產時機';
        add(noDelay ? '有感染、出血或胎兒窘迫：建議分娩。' : 'ACOG PB 217：34+0–36+6 週期待處置至 37+0 週或立即分娩皆屬合理；NICE 亦提供引產或期待至 37+0 週的選擇。');
        add('GBS 未知或陽性：分娩時給予 GBS 預防；不照搬 <34 週的延遲分娩抗生素方案。');
        add(steroids(ga));
      } else if (ga >= 24) {
        title = noDelay || labour ? '24+0–33+6 週 PPROM：不宜期待，準備分娩' : '24+0–33+6 週 PPROM：評估期待處置';
        add(noDelay || labour ? '有感染、出血、胎兒窘迫或已臨產時不採期待處置，準備分娩。' : '無感染、胎盤早剝、胎兒窘迫或臨產時可期待處置，持續監測母體體溫、宮縮與胎心。');
        add(steroids(ga));
        if (!infection) add('延遲分娩抗生素：NICE erythromycin 10 天（或 penicillin）；ACOG ampicillin + erythromycin 7 天。避免 co-amoxiclav（NEC 風險）。');
        add(magnesium(ga));
        add('ACOG：無其他分娩指徵者，建議於 34+0 週分娩。PPROM 不建議常規抑制宮縮。');
      } else if (ga >= 20) {
        title = '周邊期 PPROM（20+0–23+6 週）';
        add('與母胎醫學及新生兒科個別化諮商：期待處置、終止妊娠照護與母體感染／出血風險；不保證期待處置可改善存活。');
        add('SMFM #71：期待處置自 24 週建議延遲分娩抗生素；20+0–23+6 週可考慮。');
        add(steroids(ga, resus));
        add(magnesium(ga, resus));
      } else {
        title = '20 週前（生存期前）PPROM';
        add('個別化諮商期待處置或終止妊娠照護；說明母體感染、出血與肺發育不全風險。');
        add('此孕週不建議類固醇或硫酸鎂；延遲分娩抗生素證據有限。');
      }
    } else if (s === 'labour') {
      if (ga >= 37) {
        title = '已達足月：循足月產程流程';
        add('37+0 週後不屬早產，依足月產程與 GBS 流程處理。');
      } else {
        title = ga < 24 ? '周邊期疑似早產（完整羊膜）' : '完整羊膜、疑似早產';
        add('確認規律宮縮與子宮頸變化，評估胎心、感染及出血。');
        if (ga >= 30) add('NICE：≥30+0 週可用經陰道超音波，CL ≤15 mm 視為早產臨產，>15 mm 不太可能；或用 fFN（≥50 ng/mL 為陽性）。');
        if (ga < 24) add('與母胎醫學及新生兒科討論新生兒復甦計畫與家庭意願。');
        add(steroids(ga, resus));
        add(magnesium(ga, resus));
        if (ga >= 24 && ga < 34) {
          if (noDelay) add('有感染、出血或胎兒窘迫：抑制宮縮不適用。');
          else if (ga < 26) add('抑制宮縮：NICE 24+0–25+6 週可考慮 nifedipine，短期（約 48 小時）爭取類固醇療程或轉院。');
          else add('抑制宮縮：NICE 26+0–33+6 週提供 nifedipine（禁忌時用 oxytocin receptor antagonist），短期爭取類固醇療程或轉院；不做維持性抑制宮縮。');
        } else if (ga >= 34) {
          add('34 週後不建議抑制宮縮。');
        }
        add('GBS 未知或陽性：分娩時給予 GBS 預防；依新生兒照護能力評估轉院。');
      }
    } else if (s === 'short') {
      title = '無症狀短子宮頸';
      if (len == null || Number.isNaN(len) || len < 0 || len > 60) {
        add('請輸入經陰道超音波子宮頸長度（0–60 mm）。');
      } else if (multiple) {
        add('多胞胎：陰道黃體素與超音波指示環紮對短子宮頸的效益未證實，不建議常規使用；轉介母胎醫學。');
      } else if (ga >= 24) {
        add('已超過 24 週篩檢與預防性介入證據窗：轉介專科確認量測與症狀，不直接套用 16–24 週環紮規則。');
      } else if (raw.history === 'yes') {
        if (len < 25) {
          title = '早產史 + 短子宮頸（<25 mm）';
          add('NICE NG25：16+0–24+0 週 CL <25 mm 且有自發性早產／中期流產史，提供陰道黃體素或環紮的選擇。');
          add('ACOG / RCOG GTG 75：單胎、既往自發性早產且 24 週前 CL <25 mm（RCOG ≤25 mm），可行超音波指示環紮。');
        } else {
          add(`CL ${len} mm（≥25 mm）：16–24 週序列追蹤子宮頸長度；可討論陰道黃體素。`);
          add('若曾有 ≥3 次中期流產或早產（RCOG），可於 12–14 週討論病史指示環紮。');
        }
        add('17-OHPC 已撤市，不再建議。');
      } else {
        if (len <= 20) add(`CL ${len} mm：SMFM #70 建議單胎、無早產史、24 週前 CL ≤20 mm 使用陰道黃體素。`);
        else if (len <= 25) add(`CL ${len} mm：SMFM #70 可共同決策考慮陰道黃體素；NICE 對 CL <25 mm 即提供陰道黃體素。`);
        else add(`CL ${len} mm：>25 mm 不符合短子宮頸定義，依風險安排追蹤。`);
        if (len < 10) add('CL <10 mm：環紮證據有限，轉介母胎醫學個別討論，並先排除無痛性擴張。');
        else if (len <= 25) add('無擴張、無早產史：SMFM 不建議 CL 10–25 mm 常規環紮；不建議 17-OHPC 或子宮托。');
      }
    } else {
      title = '無痛性擴張與羊膜外露';
      if (ga >= 16 && ga < 28) {
        if (noDelay || labour) add('有感染、活躍出血、宮縮或已臨產：NICE 不建議緊急環紮。');
        else add('NICE NG25：16+0–27+6 週可由專科評估緊急（rescue）環紮；先確認羊膜未破、排除感染、出血、宮縮與胎兒異常。');
        add('說明手術風險（破水、感染）及新生兒預後，與家庭共同決策。');
        if (multiple) add('多胞胎緊急環紮資料有限，由母胎醫學個別評估。');
      } else {
        add('目前孕週不在 NICE 緊急環紮建議範圍（16+0–27+6 週），依疑似早產處置。');
      }
      if (ga >= 22) {
        add(steroids(ga, resus));
        add(magnesium(ga, resus));
      }
    }

    if (urgent) title = `優先處理母胎安全｜${title}`;
    return { ok: true, ga, label, title, alerts, points, tone: urgent ? 'urgent' : 'normal' };
  }

  return { assess, steroids, magnesium };
})();
if (typeof module !== 'undefined') module.exports = PTL;
/*ENGINE-END*/

if (typeof document !== 'undefined') {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // [title, scenario, correct, wrong, wrong, explanation]
  const cases = [
    ['29+2 週流液', '持續流液、未臨產，無發燒，無菌鴨嘴檢查看到羊水積聚。', '確診 PPROM 後評估感染、胎兒狀態與期待處置', '立即做多次數位內診', '直接安排子宮頸環紮', '符合 24–33+6 週且無禁忌的 PPROM 可期待處置，並提供類固醇及延遲分娩抗生素。'],
    ['31 週規律宮縮', '羊膜完整、規律宮縮與子宮頸變化，無感染。', '評估短期抑制宮縮以爭取類固醇及轉院時間', '長期常規抑制宮縮直到足月', '當作子宮頸閉鎖不全立即環紮', '早產處置須評估胎兒與感染；抑制宮縮主要為短期（約 48 小時）爭取介入時間。'],
    ['20 週短子宮頸', '單胎、無早產史，經陰道超音波子宮頸長 18 mm，無擴張。', '討論陰道黃體素', '一律做環紮', '使用 17-OHPC', 'SMFM 對無早產史單胎、24 週前 CL ≤20 mm 建議陰道黃體素，無擴張時不建議因 10–25 mm 短子宮頸常規環紮；17-OHPC 已撤市。'],
    ['22 週羊膜外露', '無痛性擴張，羊膜外露但未破，無宮縮、感染或出血。', '專科會診評估緊急環紮與風險', '不檢查感染直接環紮', '以 PPROM 抗生素流程取代評估', 'NICE 16+0–27+6 週可考慮緊急環紮，但須先排除禁忌並充分諮商。'],
    ['21 週 PPROM', '尚未達團隊及家庭選擇的新生兒復甦時點，生命徵象穩定。', '母胎及新生兒團隊討論期待處置與終止妊娠照護的風險及選項', '一律立刻給類固醇與鎂劑', '保證期待處置能改善存活', 'SMFM #71 強調個別化諮商；復甦與加護尚不適用時不建議類固醇及鎂劑。'],
    ['35 週 PPROM', '35+1 週確認破水，母胎穩定，無感染。', '討論期待處置或分娩與相關風險', '一律環紮', '必須給 7 天延遲分娩抗生素', 'ACOG 34+0–36+6 週允許共同決策期待或分娩；不要機械套用 24–33+6 週流程。']
  ];
  // [question, correct, wrong, wrong, explanation]
  const quiz = [
    ['PPROM 首選初步檢查？', '無菌鴨嘴檢查有無羊水積聚', '反覆數位內診', '只看單次 CRP', 'NICE 建議先無菌鴨嘴檢查；診斷須結合臨床。'],
    ['羊水積聚未見時可考慮？', 'IGFBP-1 或 PAMG-1 檢測並綜合判讀', '一律當作確診', '只靠 nitrazine', 'NICE 不建議用 nitrazine；陽性生物標記也不應單獨決定處置。'],
    ['PPROM 感染診斷應？', '結合臨床、CRP、白血球與胎心', '只看一次 CRP', '只看一次白血球', '單一檢驗不能確認或排除感染。'],
    ['NICE 對 24–33+6 週預期早產的類固醇？', '建議給予', '禁止給予', '只在 37 週後使用', 'NICE 建議於此孕週區間提供產前類固醇。'],
    ['NICE 24–29+6 週 24 小時內將生產的鎂劑？', '建議提供神經保護', '只用於子癇前症', '常規延長 7 天', 'NICE 對 24+0–29+6 週建議、30+0–33+6 週考慮硫酸鎂神經保護。'],
    ['無早產史單胎、20 週 CL 18 mm？', '討論陰道黃體素', '無擴張仍一律環紮', '17-OHPC', 'SMFM #70 建議 ≤20 mm 使用陰道黃體素，不建議無擴張者常規環紮。'],
    ['緊急環紮的禁忌？', '感染、活躍出血或宮縮', '羊膜完整', '無痛性擴張', 'NICE 對感染、出血或宮縮不建議緊急環紮；PPROM 亦是 RCOG 禁忌。'],
    ['21 週 PPROM 尚未選擇新生兒復甦？', '個別化諮商母胎風險與選項', '一律給鎂劑', '保證期待治療安全', 'SMFM #71 要求個別化諮商；類固醇與鎂劑待復甦照護合適且為病人所願。'],
    ['NICE PPROM 預防性抗生素特別避免？', 'Co-amoxiclav', '所有抗生素', 'GBS 分娩預防', 'NICE 不建議 co-amoxiclav 作為 PPROM 感染預防（NEC 風險）。'],
    ['35 週 PPROM、母胎穩定？', '討論期待處置或分娩', '立即環紮', '照搬 29 週延遲分娩方案', 'ACOG 34–36+6 週可選擇期待處置或分娩，需討論風險。'],
    // advanced (6th element = true)
    ['28+0 週 PPROM 已完成 7 天 ampicillin + erythromycin，GBS 未知，第 12 天臨產？', '仍需依 GBS 狀態給予分娩期 GBS 預防', '延遲分娩抗生素已涵蓋，不需再給', '改給 co-amoxiclav 直到分娩', 'ACOG PB 217：延遲分娩抗生素不能取代分娩時的 GBS 預防；GBS 未知且早產即符合預防指徵。', true],
    ['31 週、5 週前（26 週）已完成一個類固醇療程，羊膜完整，預計 7 天內生產？', '可考慮單次救援（rescue）療程', '每週重複一個療程直到 34 週', '已用過類固醇，不可再給', 'ACOG CO 713：<34 週、7 天內可能生產、前一療程距今 ≥14 天者可考慮單次救援療程；不建議每週或多次重複療程。', true],
    ['35 週第 1 型糖尿病孕婦，羊膜完整疑似早產？', '晚期早產類固醇不宜常規使用（新生兒低血糖風險；ALPS 試驗排除）', '一律給予 betamethasone 兩劑', '改用 dexamethasone 4 劑即可避免低血糖', 'ALPS 試驗排除孕前糖尿病；ACOG/SMFM 提醒類固醇會加重母體高血糖並增加新生兒低血糖，不常規用於此族群。', true],
    ['硫酸鎂神經保護中，膝反射消失、呼吸 10 次/分？', '停止輸注並給 calcium gluconate 1 g IV，抽血鎂濃度', '加快輸注至 2 g/h 維持神經保護', '改用 nifedipine 合併治療', '反射消失、呼吸抑制為鎂中毒徵象；停藥、給鈣劑並監測。Nifedipine 與鎂併用可能加重神經肌肉阻斷。', true],
    ['Indomethacin 抑制宮縮為何通常限 <32 週且 ≤48 小時？', '胎兒動脈導管提早收縮及羊水過少風險', '會增加母體高血糖', '會造成新生兒低血鈣', 'NSAID 抑制前列腺素：≥32 週動脈導管收縮風險上升，延長使用亦致胎兒腎血流下降、羊水過少。', true],
    ['羊膜完整疑似早產 30 週、GBS 陰性、無感染證據，是否常規給抗生素延長妊娠？', '不建議；ORACLE II 未見益處且兒童追蹤腦性麻痺增加', '建議 erythromycin 10 天', '建議 co-amoxiclav 7 天', 'NICE 不建議對羊膜完整的疑似早產常規給抗生素；只依 GBS 指徵給分娩預防。', true],
    ['30 週 PPROM 且子宮頸環紮仍在位，無感染、未臨產？', '可考慮延後拆線約 48 小時以完成類固醇，若感染或臨產立即拆除', '環紮必須保留到 37 週', '立即拆線並同時抑制宮縮 7 天', 'RCOG GTG 75：23–34 週 PPROM 無感染或臨產時，可考慮延後 48 小時拆線；長期保留環紮可能增加感染，需個別討論。', true],
    ['經陰道環紮後仍於中期流產，下一胎的環紮選項？', '討論經腹（transabdominal）環紮', '提早至 8 週再做經陰道環紮', '不需任何預防，只追蹤長度', 'RCOG GTG 75：先前經陰道環紮失敗者可考慮經腹環紮（孕前或孕早期）；分娩通常需剖腹產。', true],
    ['未臨產、無併發症者，經陰道預防性環紮何時拆除？', '36+0–37+0 週', '28 週', '待自然臨產再拆除', 'RCOG GTG 75 與 ACOG：無併發症者於 36–37 週拆除經陰道環紮；臨產時應立即拆除以減少子宮頸撕裂。', true],
    ['下列何者會使胎兒纖維連接蛋白（fFN）檢測不可靠？', '24 小時內性行為或明顯陰道出血', '單胞胎妊娠', '頭位胎兒', '性行為、出血、內診或潤滑劑可能造成偽陽性；應在內診前採檢並由檢驗結果結合臨床判讀。', true]
  ];

  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }

  function make(items, selector, isCase) {
    const root = $(selector);
    root.innerHTML = items.map((x, i) => {
      const opts = isCase ? x.slice(2, 5) : x.slice(1, 4);
      const order = shuffle([0, 1, 2]);
      return `<article class="${isCase ? 'case' : 'q'}"><small>${isCase ? 'CASE' : 'QUESTION'} ${String(i + 1).padStart(2, '0')}${x[6] === true || (!isCase && x[5] === true) ? ' · <span class="adv">高階</span>' : ''}</small><h3>${esc(x[0])}</h3>${isCase ? `<p>${esc(x[1])}</p>` : ''}<div>${order.map((j, k) => `<button type="button" class="option" aria-pressed="false" data-correct="${j === 0}">${'ABC'[k]} · ${esc(opts[j])}</button>`).join('')}</div><div class="feedback" hidden></div></article>`;
    }).join('');
    root.querySelectorAll('article').forEach((el, i) => el.querySelectorAll('.option').forEach(btn => btn.addEventListener('click', () => {
      el.querySelectorAll('.option').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn); });
      const right = btn.dataset.correct === 'true';
      const f = el.querySelector('.feedback');
      f.hidden = false;
      f.classList.toggle('right', right);
      f.textContent = (right ? '答對了。' : '請再核對。') + (isCase ? items[i][5] : items[i][4]);
    })));
  }

  make(cases, '#case-list', true);
  make(quiz, '#questions', false);
  $('#reset').addEventListener('click', () => { make(quiz, '#questions', false); $('#quiz').scrollIntoView(); });

  const form = $('#form');
  function render() {
    const d = Object.fromEntries(new FormData(form));
    const ga = Number(d.week) + Number(d.day) / 7;
    form.querySelector('[data-for="short"]').hidden = d.scenario !== 'short';
    form.querySelector('[data-for="resus"]').hidden = !(ga >= 20 && ga < 24) || d.scenario === 'short';
    const r = PTL.assess(d);
    const box = $('#result');
    box.classList.toggle('urgent', r.tone === 'urgent');
    if (!r.ok) { box.innerHTML = `<p class="eyebrow">TEACHING PATHWAY</p><h3>${r.title}</h3><p>${r.points[0]}</p>`; return; }
    box.innerHTML = `<p class="eyebrow">TEACHING PATHWAY · ${r.label}</p><h3>${esc(r.title)}</h3>${r.alerts.length ? `<ul class="alerts">${r.alerts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}<ul>${r.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p>以原始指引與院內母胎醫學／新生兒團隊流程核對。</p>`;
  }
  form.addEventListener('submit', e => { e.preventDefault(); render(); $('#result').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();
}
