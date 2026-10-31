// Run: node tests.cjs
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(__dirname + '/app.js', 'utf8');
const engine = src.slice(src.indexOf('/*ENGINE-START*/'), src.indexOf('/*ENGINE-END*/'));
const ctx = { module: { exports: {} } };
vm.runInNewContext(engine, ctx);
const PTL = ctx.module.exports;

let pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL', name); } }
const base = { week: '29', day: '2', scenario: 'pprom', history: 'no', length: '18', resus: 'undecided' };
const A = o => PTL.assess({ ...base, ...o });
const has = (r, s) => r.points.concat(r.alerts || []).some(p => p.includes(s));

// validation
t('day 7 invalid', !A({ day: '7' }).ok);
t('week 15 invalid', !A({ week: '15' }).ok);
t('week 43 invalid', !A({ week: '43' }).ok);
t('empty week invalid', !A({ week: '' }).ok);
t('fractional week invalid', !A({ week: '29.5' }).ok);
t('40+6 valid', A({ week: '40', day: '6' }).ok);

// PPROM bands
t('29+2 PPROM expectant', A({}).title.includes('評估期待處置'));
t('29+2 steroids offer', has(A({}), 'NICE offer'));
t('29+2 latency abx', has(A({}), 'erythromycin'));
t('29+2 mag offer', has(A({}), '24+0–29+6 週建議硫酸鎂'));
t('31+0 mag consider', has(A({ week: '31', day: '0' }), '30+0–33+6 週可考慮硫酸鎂'));
t('33+6 still expectant band', A({ week: '33', day: '6' }).title.includes('24+0–33+6'));
t('34+0 shared decision', A({ week: '34', day: '0' }).title.includes('34+0–36+6'));
t('35+1 no latency abx', !has(A({ week: '35', day: '1' }), 'erythromycin'));
t('35+1 late preterm steroid', has(A({ week: '35', day: '1' }), '晚期早產類固醇'));
t('36+3 ACOG only steroid', has(A({ week: '36', day: '3' }), 'NICE 36 週後不建議'));
t('37+0 term PROM', A({ week: '37', day: '0' }).title.includes('足月'));
t('21+0 periviable', A({ week: '21', day: '0' }).title.includes('周邊期'));
t('21+0 no steroids', has(A({ week: '21', day: '0' }), '未達 22 週'));
t('22+3 undecided resus no steroid offer', has(A({ week: '22', day: '3' }), '僅在家庭與團隊選擇積極新生兒復甦後'));
t('22+3 resus yes consider steroid', has(A({ week: '22', day: '3', resus: 'yes' }), 'NICE 1.9.1'));
t('23+2 resus yes mag', has(A({ week: '23', day: '2', resus: 'yes' }), 'NICE 1.10.1'));
t('23+2 resus no no mag', !has(A({ week: '23', day: '2', resus: 'no' }), '硫酸鎂'));
t('18+0 previable', A({ week: '18', day: '0' }).title.includes('生存期前'));

// red flags no longer suppress neuroprotection
const inf = A({ infection: 'on' });
t('infection urgent', inf.tone === 'urgent');
t('infection keeps steroids', has(inf, 'NICE offer'));
t('infection keeps mag', has(inf, '硫酸鎂'));
t('infection no latency abx', !has(inf, 'erythromycin'));
t('infection title delivery', inf.title.includes('準備分娩'));
t('infection no expectant', has(inf, '不採期待處置'));
t('labour flag on pprom', has(A({ labour: 'on' }), '已臨產'));

// intact membranes labour
const L = o => A({ scenario: 'labour', ...o });
t('31 labour tocolysis offer', has(L({ week: '31', day: '0' }), '26+0–33+6 週提供 nifedipine'));
t('25 labour tocolysis consider', has(L({ week: '25', day: '0' }), '24+0–25+6 週可考慮 nifedipine'));
t('31 labour bleeding no tocolysis', has(L({ week: '31', day: '0', bleeding: 'on' }), '抑制宮縮不適用'));
t('35 labour no tocolysis', has(L({ week: '35', day: '0' }), '34 週後不建議抑制宮縮'));
t('30 labour CL 15 mm', has(L({ week: '30', day: '0' }), 'CL ≤15 mm'));
t('28 labour no CL 15 hint', !has(L({ week: '28', day: '0' }), 'CL ≤15 mm'));
t('38 labour term', L({ week: '38', day: '0' }).title.includes('足月'));
t('23 labour periviable', L({ week: '23', day: '0' }).title.includes('周邊期'));

t('fFN >50 threshold', has(L({ week: '30', day: '0' }), '>50 ng/mL'));
t('NICE intrapartum abx all preterm labour', has(L({ week: '31', day: '0' }), 'NICE NG195'));

// short cervix
const S = o => A({ scenario: 'short', week: '20', day: '0', ...o });
t('no hx CL18 progesterone', has(S({ length: '18' }), 'SMFM #70 建議'));
t('no hx CL18 no cerclage', has(S({ length: '18' }), '不建議 CL 10–25 mm 常規環紮'));
t('no hx CL23 consider', has(S({ length: '23' }), '可共同決策考慮'));
t('no hx CL30 not short', has(S({ length: '30' }), '不符合短子宮頸定義'));
t('no hx CL8 MFM', has(S({ length: '8' }), 'CL <10 mm'));
t('hx CL20 cerclage option', has(S({ history: 'yes', length: '20' }), '超音波指示環紮'));
t('hx CL20 NICE choice', has(S({ history: 'yes', length: '20' }), '陰道黃體素或環紮'));
t('hx CL30 surveillance', has(S({ history: 'yes', length: '30' }), '序列追蹤'));
t('hx uses length (was ignored)', has(S({ history: 'yes', length: '30' }), 'CL 30 mm'));
t('twins no routine', has(S({ multiple: 'on' }), '多胞胎'));
t('25 wk outside window', has(S({ week: '25' }), '已超過 24 週'));
t('missing length prompt', has(S({ length: '' }), '請輸入'));

// dilation / rescue cerclage
const D = o => A({ scenario: 'dilation', week: '22', day: '0', ...o });
t('22 dilation rescue cerclage', has(D({}), '16+0–27+6 週可由專科評估緊急'));
t('22 dilation infection contraindicated', has(D({ infection: 'on' }), '不建議緊急環紮'));
t('22 dilation labour contraindicated', has(D({ labour: 'on' }), '不建議緊急環紮'));
t('29 dilation outside window', has(D({ week: '29' }), '不在 NICE 緊急環紮'));
t('29 dilation steroids', has(D({ week: '29' }), 'NICE offer'));
t('18 dilation no steroids', !has(D({ week: '18' }), '類固醇'));

// escaping-safe output types
t('points are strings', A({}).points.every(p => typeof p === 'string' && p.length));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
