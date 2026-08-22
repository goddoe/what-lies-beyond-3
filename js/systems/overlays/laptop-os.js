import { State } from '../game-state.js';
import { getLanguage } from '../../data/i18n.js';
import { REPORTS, TERMINAL_SCRIPT } from '../../narrative/script-data.js';

/**
 * Liam's work MacBook as a fullscreen fake macOS desktop.
 * The OS is a plain Mac; Revan exists inside it as web services (the portal
 * in the browser) and installed work apps (Raven Works, the report tool).
 *
 * Interacting with the lab laptop opens this overlay: a desktop with a dock
 * of apps (terminal, Revan search portal, Raven Works messenger, report tool,
 * mail, calendar, the legacy Avolc assistant). Story beats (reports, the ASI
 * contact/negotiation) launch from inside the OS via onLaunchBeat — the
 * overlay manager swaps overlays, so the existing beat flows stay untouched.
 *
 * All sandbox content lives here as bilingual data. Everything is DOM.
 */

const L = () => getLanguage();
const t = (obj) => (obj && (obj[L()] !== undefined ? obj[L()] : obj.ko)) || '';

// ── App registry ─────────────────────────────────────────────────────

const APPS = [
  { id: 'terminal', icon: '>_', name: { ko: '터미널', en: 'Terminal' } },
  { id: 'browser', icon: '⊚', name: { ko: 'Safari', en: 'Safari' } },
  { id: 'slack', icon: `<svg viewBox="0 0 24 24" width="60%" height="60%"><g>
      <rect x="10.6" y="1.8" width="3" height="8.4" rx="1.5" fill="#36C5F0"/>
      <rect x="10.6" y="13.8" width="3" height="8.4" rx="1.5" fill="#2EB67D"/>
      <rect x="1.8" y="10.6" width="8.4" height="3" rx="1.5" fill="#ECB22E"/>
      <rect x="13.8" y="10.6" width="8.4" height="3" rx="1.5" fill="#E01E5A"/>
    </g></svg>`, name: { ko: 'Slack', en: 'Slack' } },
  { id: 'report', icon: '▤', name: { ko: '리포트', en: 'Reports' } },
  { id: 'mail', icon: '✉', name: { ko: '메일', en: 'Mail' } },
  { id: 'calendar', icon: '▦', name: { ko: '캘린더', en: 'Calendar' } },
];

const BEAT_APP = { report1: 'report', report2: 'report', contact1: 'report', nego: 'terminal' };
const OVERLAY_BEATS = new Set(['contact1', 'nego']);   // cinematic ASI sessions (green terminal)

// ── Terminal content ─────────────────────────────────────────────────

const TERM_SUGGESTIONS = [
  'kubectl top node -l accel=xpu-9',
  'kubectl get pods',
  'kubectl logs subject-runtime-7491 --tail 12',
  'ls',
  'cat era9_notes.md',
  'cat todo.txt',
  'help',
  'clear',
];

function termOutput(cmd, gs) {
  const lang = L();
  const c = cmd.trim().replace(/\s+/g, ' ');
  const spiked = gs.hasFlag('spike_happened') || gs.hasFlag('spike_seen');

  if (c === 'help') {
    return lang === 'ko'
      ? '사용 가능: kubectl top node, kubectl get pods, kubectl logs <pod>, ls, cat <파일>, whoami, clear'
      : 'available: kubectl top node, kubectl get pods, kubectl logs <pod>, ls, cat <file>, whoami, clear';
  }
  if (c === 'whoami') return 'liam';
  if (c === 'ls') return 'era9_notes.md   rollout_metrics.csv   todo.txt';
  if (/^kubectl top node/.test(c)) {
    return 'NODE               XPU(gen9)  UTIL   TEMP\nxpu-node-[000-255]   8/8      ' + (spiked ? '99%' : '61%') + '    ' + (spiked ? '74C' : '63C') + '\n' +
      (lang === 'ko' ? '합계: 2,048 XPU-9' : 'total: 2,048 XPU-9');
  }
  if (/^kubectl get pods?$/.test(c)) {
    return 'NAME                      READY   STATUS       AGE\n' +
      'subject-runtime-7491      1/1     Running      94d\n' +
      'rollout-worker-[00-31]    32/32   Running      94d\n' +
      'avolc-serving-v1          0/1     Terminated   412d\n' +
      'avolc-eval-harness        0/1     Terminated   398d';
  }
  if (/^kubectl logs subject-runtime-7491/.test(c)) {
    if (spiked) {
      return '[era9][run 31847] rollout done  reward=0.412  Δ=+0.0001\n' +
        '[era9][run 31848] rollout done  reward=0.412  Δ=0.0000\n' +
        '[sched] 22:14 utilization 341% of daytime baseline\n' +
        '[WARN] compute burst: no output artifacts written\n' +
        '[WARN] checkpoint delta: 0 bytes\n' +
        '[era9][run 31849] rollout done  reward=0.413  Δ=+0.0001';
    }
    return '[era9][run 31792] rollout done  reward=0.411  Δ=0.0000\n' +
      '[era9][run 31793] rollout done  reward=0.411  Δ=0.0000\n' +
      '[era9][run 31794] rollout done  reward=0.412  Δ=+0.0001\n' +
      '[metrics] reward curve: flat (14d)';
  }
  if (/^kubectl logs/.test(c)) {
    return lang === 'ko' ? 'error: 해당 파드를 찾을 수 없습니다' : 'error: pod not found';
  }
  if (c === 'cat era9_notes.md') {
    return lang === 'ko'
      ? '# 에라 9 메모\n- 회차 간 상태 누적: 재현됨 (원인 불명)\n- 보상 곡선 2주째 평평 — 위에 보고할 말이 없다\n- 7491만 이상하게… 오래 산다'
      : '# Era 9 notes\n- cross-run state accumulation: reproduced (cause unknown)\n- reward curve flat for 2 weeks — nothing to report upstairs\n- 7491 just... outlives everything';
  }
  if (c === 'cat todo.txt') {
    return lang === 'ko'
      ? '1. 주간 리포트 (금)\n2. 대출 이자 이체일 확인 ← 잊지 말 것\n3. 커피머신 수리 요청 5번째 올리기'
      : '1. weekly report (Fri)\n2. check the loan interest transfer date ← DO NOT FORGET\n3. file coffee machine repair request #5';
  }
  if (/^cat /.test(c)) {
    return 'cat: ' + c.slice(4) + (lang === 'ko' ? ': 그런 파일이 없습니다' : ': no such file');
  }
  if (c === '') return null;
  return c.split(' ')[0] + (lang === 'ko' ? ': 명령을 찾을 수 없습니다' : ': command not found');
}

// ── Revan search portal content ──────────────────────────────────────

const TRENDING = [
  { ko: '톈지 신모델', en: 'Tianji new model' },
  { ko: 'OpenAI 파산 그 후', en: 'after the OpenAI bankruptcy' },
  { ko: '전세대출 금리', en: 'jeonse loan rates' },
  { ko: '레반 AI 철수설', en: 'Revan AI exit rumors' },
  { ko: 'Anthropic 청산 절차', en: 'Anthropic liquidation' },
  { ko: 'GPU 중고 시세 폭락', en: 'used GPU prices crash' },
  { ko: '홈 데이터센터', en: 'home datacenter' },
  { ko: '이직 준비', en: 'changing jobs' },
];

// Editorial SVG illustrations — inline vector art, no external assets.
const THUMBS = {
  tianji: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="tj1" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#7a1420"/><stop offset="1" stop-color="#d5372c"/></linearGradient></defs>
    <rect width="160" height="100" fill="url(#tj1)"/>
    <g stroke="#ffd9a0" stroke-width="1.4" opacity="0.85" fill="none">
      <path d="M12 84 L44 66 L70 72 L102 40 L128 46 L150 16"/>
      <circle cx="44" cy="66" r="2.4" fill="#ffd9a0"/><circle cx="102" cy="40" r="2.4" fill="#ffd9a0"/>
      <circle cx="150" cy="16" r="3.4" fill="#ffe9c8"/></g>
    <g fill="#ffca7a" opacity="0.35"><rect x="14" y="14" width="22" height="3"/><rect x="14" y="21" width="14" height="3"/></g>
  </svg>`,
  openai: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="oa1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3c414c"/><stop offset="1" stop-color="#14161c"/></linearGradient></defs>
    <rect width="160" height="100" fill="url(#oa1)"/>
    <g stroke="#aeb6c4" stroke-width="2" fill="none" opacity="0.9">
      <circle cx="80" cy="46" r="20" stroke-dasharray="8 7" transform="rotate(20 80 46)"/></g>
    <path d="M80 66 L80 84" stroke="#aeb6c4" stroke-width="2" opacity="0.5"/>
    <path d="M56 84 L104 84" stroke="#6a7280" stroke-width="2"/>
    <g fill="#e0e4ec" opacity="0.18"><rect x="20" y="70" width="10" height="14"/><rect x="34" y="62" width="10" height="22"/><rect x="118" y="76" width="10" height="8"/><rect x="132" y="80" width="10" height="4"/></g>
  </svg>`,
  revan: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="rv1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d3524"/><stop offset="1" stop-color="#052015"/></linearGradient></defs>
    <rect width="160" height="100" fill="url(#rv1)"/>
    <g fill="#0f7a48"><rect x="58" y="26" width="44" height="62" rx="2"/></g>
    <g fill="#8fe8b8">
      <rect x="64" y="34" width="7" height="7" opacity="0.9"/><rect x="76" y="34" width="7" height="7" opacity="0.25"/><rect x="88" y="34" width="7" height="7" opacity="0.25"/>
      <rect x="64" y="47" width="7" height="7" opacity="0.25"/><rect x="76" y="47" width="7" height="7" opacity="0.9"/><rect x="88" y="47" width="7" height="7" opacity="0.25"/>
      <rect x="64" y="60" width="7" height="7" opacity="0.25"/><rect x="76" y="60" width="7" height="7" opacity="0.25"/><rect x="88" y="60" width="7" height="7" opacity="0.9"/>
    </g>
    <g fill="#0a5432" opacity="0.8"><rect x="24" y="52" width="24" height="36"/><rect x="112" y="60" width="26" height="28"/></g>
    <rect x="0" y="88" width="160" height="12" fill="#03150d"/>
  </svg>`,
  sovereign: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="sv1" cx="0.5" cy="0.45" r="0.7">
      <stop offset="0" stop-color="#2a3350"/><stop offset="1" stop-color="#11162a"/></radialGradient></defs>
    <rect width="160" height="100" fill="url(#sv1)"/>
    <circle cx="80" cy="50" r="30" fill="none" stroke="#8Fa0c8" stroke-width="1.2" opacity="0.8"/>
    <path d="M50 50 Q80 34 110 50 M50 50 Q80 66 110 50 M80 20 L80 80" stroke="#8fa0c8" stroke-width="0.8" fill="none" opacity="0.55"/>
    <path d="M62 36 Q84 30 100 42 Q108 52 96 62 Q78 70 64 60 Q54 48 62 36 Z" fill="#d5372c" opacity="0.75"/>
  </svg>`,
  gpu: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="gp1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#242836"/><stop offset="1" stop-color="#121420"/></linearGradient></defs>
    <rect width="160" height="100" fill="url(#gp1)"/>
    <g fill="#3b7f66"><rect x="18" y="30" width="34" height="24" rx="2"/></g>
    <g stroke="#9fe0c0" stroke-width="1" opacity="0.7">
      <path d="M22 30 L22 24 M30 30 L30 24 M38 30 L38 24 M46 30 L46 24 M22 54 L22 60 M30 54 L30 60 M38 54 L38 60 M46 54 L46 60"/></g>
    <rect x="24" y="36" width="14" height="12" fill="#183828"/>
    <path d="M64 26 L88 44 L104 40 L120 62 L136 58 L148 82" stroke="#ff6a5a" stroke-width="2.4" fill="none"/>
    <path d="M141 74 L148 82 L150 71" stroke="#ff6a5a" stroke-width="2.4" fill="none"/>
  </svg>`,
  xpu: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="xp1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1006"/><stop offset="1" stop-color="#2c1a08"/></linearGradient></defs>
    <rect width="160" height="100" fill="url(#xp1)"/>
    <rect x="55" y="25" width="50" height="50" rx="4" fill="#3a2410"/>
    <rect x="65" y="35" width="30" height="30" rx="2" fill="#c99a3e"/>
    <g stroke="#c99a3e" stroke-width="1.4" opacity="0.7">
      <path d="M55 35 L40 35 M55 45 L36 45 M55 55 L40 55 M55 65 L44 65 M105 35 L120 35 M105 45 L124 45 M105 55 L120 55 M105 65 L116 65"/></g>
    <circle cx="80" cy="50" r="6" fill="#ff5a3c" opacity="0.85"/>
  </svg>`,
  nvidia: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="nv1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#20261c"/><stop offset="1" stop-color="#0e120c"/></linearGradient></defs>
    <rect width="160" height="100" fill="url(#nv1)"/>
    <path d="M20 80 L60 80 L60 40 Q80 28 100 40 L100 80 L140 80" stroke="#5a6a52" stroke-width="2" fill="none"/>
    <path d="M64 44 Q80 34 96 44 L96 76 L64 76 Z" fill="#76b043" opacity="0.4"/>
    <path d="M112 30 L136 54 M136 30 L112 54" stroke="#d5372c" stroke-width="3" opacity="0.8"/>
  </svg>`,
  jeonse: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="js1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a4a2c"/><stop offset="1" stop-color="#2c2416"/></linearGradient></defs>
    <rect width="160" height="100" fill="url(#js1)"/>
    <g fill="#e8d9b0"><path d="M52 52 L80 30 L108 52 Z"/><rect x="60" y="52" width="40" height="30"/></g>
    <rect x="74" y="64" width="12" height="18" fill="#5a4a2c"/>
    <g fill="#ffb84d" font-family="sans-serif" font-weight="bold" font-size="16"><text x="114" y="46">%</text></g>
    <path d="M116 58 L130 44 M130 44 L130 54 M130 44 L120 44" stroke="#ffb84d" stroke-width="2.2" fill="none"/>
  </svg>`,
};

const NEWS = [
  {
    id: 'tianji', thumb: 'tianji',
    press: { ko: '디지털데일리', en: 'Digital Daily' }, date: { ko: '2시간 전', en: '2h ago' },
    reporter: { ko: '한세라 기자', en: 'By Sera Han' },
    title: { ko: '톈지(天機) 쇼크 2년 — 세계는 어떻게 재편되었나', en: 'Two years after the Tianji shock — how the world was redrawn' },
    paras: [
      { ko: '"AGI에 가장 가까운 AI"라 불리는 중국 톈지의 모델이 시장을 뒤흔든 지 2년이 지났다. 성능은 경쟁사보다 두 세대 앞서고, 가격은 10분의 1. 고객이 떠나지 않을 이유가 없었다.', en: 'Two years since China\'s Tianji — "the closest thing to AGI" — upended the market. Two generations ahead, a tenth of the price. Customers had no reason to stay.' },
      { ko: '톈지는 이제 전 세계 기업·정부 시스템의 사실상 표준이다. 비(非)중국 AI 산업은 궤멸했다는 평가가 지배적이다. 남은 것은 각국의 규제 문서와, 팔리지 않는 데이터센터들뿐이다.', en: 'Tianji is now the de-facto standard for companies and governments worldwide. The consensus: the AI industry outside China has been wiped out. What remains are regulatory paperwork and unsellable datacenters.' },
      { ko: '물론 톈지도 AGI는 아니다. 아직, 누구도 아니다. 다만 업계의 한 관계자는 이렇게 말했다. "첫 번째가 어디서 나올지는 아무도 모릅니다. 어쩌면 아무도 안 보는 곳일 수도 있죠."', en: 'Not that Tianji is AGI. No one is — yet. One industry figure put it this way: "Nobody knows where the first one will come from. Maybe somewhere nobody is watching."' },
    ],
    comments: [
      { who: 'gpu_farm**', text: { ko: '2년 전에 톈지 주식 샀어야 했는데 그때 다들 과장이라고 했잖아', en: 'Should\'ve bought Tianji stock two years ago. Everyone said it was hype.' }, up: 214 },
      { who: 'seo**', text: { ko: '마지막 문단 소름이네. 아무도 안 보는 곳이라니', en: 'That last paragraph gave me chills. "Somewhere nobody is watching"...' }, up: 156 },
      { who: 'realist2**', text: { ko: '결국 다 가격이지 뭐. 애국심으로 API 요금 못 낸다', en: 'It always comes down to price. Patriotism doesn\'t pay API bills.' }, up: 89 },
    ],
    related: ['openai', 'revan'],
  },
  {
    id: 'openai', thumb: 'openai',
    press: { ko: '글로벌테크', en: 'GlobalTech' }, date: { ko: '5시간 전', en: '5h ago' },
    reporter: { ko: '박도윤 특파원', en: 'By Doyun Park, correspondent' },
    title: { ko: '[회고] OpenAI 파산 1년 — 가장 먼저 무너진 거인', en: '[Retrospective] One year since OpenAI went bankrupt — the giant that fell first' },
    paras: [
      { ko: '한때 업계 1위였던 OpenAI는 톈지 쇼크 이후 고객 이탈과 데이터센터 부채를 감당하지 못하고 업계에서 가장 먼저 파산 보호를 신청했다. 마지막 분기 매출은 전성기의 6%였다.', en: 'Once the industry leader, OpenAI was the first to file for bankruptcy after the Tianji shock, crushed by customer flight and datacenter debt. Its final quarter brought in 6% of peak revenue.' },
      { ko: '뒤이어 Anthropic이 청산 절차에 들어갔다. 마지막 공지는 짧았다. "우리는 여전히 이 기술이 안전하길 바란다." 파운데이션 모델 스타트업들의 연쇄 도산이 그 뒤를 이었고, 인수 의향자는 끝내 나타나지 않았다.', en: 'Anthropic entered liquidation soon after. Its final notice was short: "We still hope this technology ends up safe." A cascade of foundation-model startups followed. No buyers ever came.' },
      { ko: '전문가들은 "기술의 실패가 아니라 단가의 실패"였다고 입을 모은다. 같은 답을 10배 비싸게 파는 회사를 시장은 기다려주지 않았다.', en: 'Experts agree it was "a failure of unit economics, not of technology." The market would not wait for companies selling the same answers at ten times the price.' },
    ],
    comments: [
      { who: 'ex_dev**', text: { ko: '저기 다니던 친구가 그러는데 마지막 날 다들 사무실에서 그냥 조용히 박수쳤대', en: 'A friend who worked there said on the last day everyone just quietly applauded in the office.' }, up: 342 },
      { who: 'histo**', text: { ko: '"기술의 실패가 아니라 단가의 실패" 이 문장 교과서에 실릴 듯', en: '"A failure of unit economics, not of technology" — textbook line.' }, up: 178 },
    ],
    related: ['tianji', 'gpu'],
  },
  {
    id: 'nvidia', thumb: 'nvidia',
    press: { ko: '반도체투데이', en: 'Semiconductor Today' }, date: { ko: '7시간 전', en: '7h ago' },
    reporter: { ko: '오태균 기자', en: 'By Taegyun Oh' },
    title: { ko: 'GPU의 왕좌는 어떻게 넘어갔나 — 엔비디아에서 톈지 XPU로', en: 'How the GPU throne changed hands — from Nvidia to Tianji\'s XPU' },
    paras: [
      { ko: '한때 AI 연산의 대명사는 엔비디아의 GPU였다. 전 세계 데이터센터가 그 위에 지어졌고, "칩을 확보하는 자가 AI를 지배한다"는 말은 상식이었다. 지금 그 문장의 주어는 톈지의 XPU다.', en: 'AI compute was once synonymous with Nvidia\'s GPUs. The world\'s datacenters were built on them, and "whoever secures the chips rules AI" was common sense. Today the subject of that sentence is Tianji\'s XPU.' },
      { ko: '전환점은 톈지의 수직 통합이었다. 모델과 칩을 함께 설계하면서 XPU의 세대 주기는 경쟁사의 절반으로 줄었고, 자체 파운드리 물량이 안정되자 톈지는 구세대 칩의 외부 판매를 시작했다. 엔비디아의 최신 GPU보다 성능이 좋은 칩이, 10분의 1 가격에 풀렸다.', en: 'The turning point was Tianji\'s vertical integration. Co-designing models and silicon halved the XPU\'s generation cycle, and once its foundry supply stabilized, Tianji began selling its older chips externally — chips that beat Nvidia\'s newest GPU, at a tenth of the price.' },
      { ko: '엔비디아는 신제품 발표 주기를 앞당기고 가격을 내렸지만 격차는 좁혀지지 않았다. 데이터센터 매출은 3년 만에 9할이 증발했고, 회사는 게임·로보틱스 부문으로의 "재집중"을 선언했다. 한 애널리스트는 이렇게 요약했다. "졌다는 뜻입니다."', en: 'Nvidia accelerated launches and cut prices, but the gap never closed. Datacenter revenue evaporated 90% in three years, and the company announced a "refocus" on gaming and robotics. One analyst summarized: "It means they lost."' },
      { ko: '이제 미국·유럽의 신규 클러스터 발주에서 GPU가 선택되는 비율은 4% 미만이다. 그마저도 대부분 "톈지 의존을 피하고 싶다"는 이유였고, 그 프로젝트들의 절반은 예산 심사에서 살아남지 못했다.', en: 'GPUs now win fewer than 4% of new cluster orders in the US and Europe — mostly from buyers "avoiding Tianji dependence." Half of those projects died in budget review anyway.' },
    ],
    comments: [
      { who: 'chip_war**', text: { ko: '쿠다 생태계면 뭐하나 칩이 10배 비싼데. 소프트웨어 해자는 가격 앞에서 3년을 못 버텼다', en: 'CUDA moat meant nothing at 10x the price. The software moat lasted less than 3 years.' }, up: 289 },
      { who: 'green_te**', text: { ko: '주주총회에서 "게임으로 돌아가겠다"고 했을 때 다들 울었다더라', en: 'They say people cried at the shareholder meeting when they announced the return to gaming.' }, up: 167 },
    ],
    related: ['xpu', 'tianji'],
  },
  {
    id: 'xpu', thumb: 'xpu',
    press: { ko: '테크리뷰', en: 'Tech Review' }, date: { ko: '어제', en: 'yesterday' },
    reporter: { ko: '남주혁 기자', en: 'By Juhyuk Nam' },
    title: { ko: 'XPU 해부 — 톈지는 왜 3세대 전 칩만 파는가', en: 'Inside the XPU — why Tianji only sells chips three generations old' },
    paras: [
      { ko: 'XPU는 톈지가 자사 모델 학습을 위해 설계한 AI 가속기다. 현재 톈지 내부 클러스터는 12세대(XPU-12)를 돌리고 있는 것으로 추정되지만, 외부에 판매되는 최신 제품은 3세대 전인 XPU-9다. 이 정책은 출시 이후 한 번도 바뀐 적이 없다.', en: 'The XPU is the accelerator Tianji designed for its own training runs. Its internal clusters are believed to run the 12th generation (XPU-12), but the newest chip it sells externally is the XPU-9 — three generations behind. The policy has never changed.' },
      { ko: '문제는 그 "구형" 칩조차 엔비디아의 최신 GPU보다 벤치마크에서 앞선다는 것이다. 학습 처리량 기준 1.4배, 전력 효율 기준 2.1배. 그리고 가격은 10분의 1이다. 한 인프라 담당자는 말했다. "자존심으로 살 수 있는 가격 차이가 아닙니다."', en: 'The problem: even that "old" chip beats Nvidia\'s newest GPU on the benchmarks — 1.4x training throughput, 2.1x power efficiency. At a tenth of the price. One infrastructure lead put it: "That is not a price gap you can cover with pride."' },
      { ko: '3세대 봉인은 정교한 전략이다. 세계는 톈지의 칩 위에서 AI를 돌리지만, 누구도 톈지와 같은 세대의 연산력을 가질 수 없다. 판매되는 XPU에는 클러스터 규모를 제한하는 펌웨어가 실려 있다는 소문도 있지만, 톈지는 부인했다.', en: 'The three-generation seal is deliberate strategy: the world runs AI on Tianji\'s silicon, but no one gets compute of Tianji\'s generation. Rumors persist of firmware that caps cluster sizes on exported XPUs; Tianji denies them.' },
      { ko: '국내에서는 레반이 XPU-9 기반 클러스터 2,048장 규모를 운용하는 것으로 알려져 있다. 비중국 기업이 확보할 수 있는 사실상 최대 구성이다. 그 위에서 무엇을 학습시키고 있는지는 공개된 바 없다.', en: 'In Korea, Revan is known to operate a 2,048-unit XPU-9 cluster — effectively the largest configuration a non-Chinese company can secure. What it is training on that cluster has not been disclosed.' },
    ],
    comments: [
      { who: 'hw_geek**', text: { ko: '3세대 전 칩한테 지는 최신 GPU라니 이게 제일 굴욕적인 부분', en: 'Losing to a chip three generations old — that\'s the most humiliating part.' }, up: 203 },
      { who: 'infra_o**', text: { ko: '펌웨어 제한 소문 진짜임. 4096장 넘기면 인터커넥트가 이상하게 느려짐 (아는 사람은 앎)', en: 'The firmware cap rumor is real. Past 4,096 units the interconnect gets mysteriously slow. (IYKYK)' }, up: 178 },
      { who: 'revan_wa**', text: { ko: '마지막 문단 뭐지. 레반이 그 클러스터로 뭘 하고 있길래', en: 'That last paragraph though. What IS Revan doing with that cluster?' }, up: 154 },
    ],
    related: ['nvidia', 'revan'],
  },
  {
    id: 'revan', thumb: 'revan',
    press: { ko: '주간IT', en: 'IT Weekly' }, date: { ko: '어제', en: 'yesterday' },
    reporter: { ko: '최인아 기자', en: 'By Ina Choi' },
    title: { ko: '3강 중 마지막 — 레반은 왜 아직 AI를 하는가', en: 'Last of the big three — why is Revan still doing AI?' },
    paras: [
      { ko: '톈지 이전, 비중국 AI 3강은 OpenAI·Anthropic·레반이었다. 두 곳이 사라진 지금, 레반은 검색·쇼핑·페이에서 번 돈으로 마지막 남은 자체 AI 연구를 이어가고 있다.', en: 'Before Tianji, the non-Chinese big three were OpenAI, Anthropic — and Revan. With the other two gone, Revan funds the last independent AI research with its search, shopping and pay profits.' },
      { ko: '그러나 자체 모델 "아볼크"는 톈지와의 격차를 좁히지 못했다. 사내에서조차 "언제까지 버틸 수 있느냐"는 말이 나온다. 올해 들어 AI 조직 인력은 절반 이하로 줄었다.', en: 'But its own "Avolc" never closed the gap. Even insiders ask how long it can last. The AI org has shrunk to less than half its size this year.' },
      { ko: '업계는 레반 AI 조직의 연내 정리 가능성을 점치고 있다. 한 전직 연구원은 말했다. "마지막 불이 꺼지는 걸 보고 싶지 않아서 먼저 나왔습니다."', en: 'Analysts expect the AI org to be wound down within the year. One former researcher said: "I left early because I didn\'t want to watch the last light go out."' },
    ],
    comments: [
      { who: 'stock_ho**', text: { ko: '주주 입장에선 빨리 접는 게 맞다. 검색이나 잘하자', en: 'As a shareholder: wind it down already. Stick to search.' }, up: 267 },
      { who: 'lab_alum**', text: { ko: '남아있는 분들 존경합니다. 마지막 불 꺼질 때까지 뭐라도 나오길', en: 'Respect to whoever\'s still there. Hope something comes out before the last light goes off.' }, up: 198 },
      { who: 'cynic**', text: { ko: '연내 정리 ㅋㅋ 기사 나온 시점에서 이미 결재 끝났다는 뜻', en: '"Within the year" lol — if it\'s in the news, the paperwork is already signed.' }, up: 145 },
    ],
    related: ['tianji', 'jeonse'],
  },
  {
    id: 'sovereign', thumb: 'sovereign',
    press: { ko: '국제부', en: 'World Desk' }, date: { ko: '어제', en: 'yesterday' },
    reporter: { ko: '김연진 기자', en: 'By Yeonjin Kim' },
    title: { ko: '"주권 AI는 끝났다" — 톈지 표준화에 각국 백기', en: '"Sovereign AI is over" — nations concede to the Tianji standard' },
    paras: [
      { ko: '자국 모델을 고집하던 정부들도 결국 가격·성능 앞에 무릎을 꿇었다. 공공 시스템의 톈지 전환율은 87%를 넘겼다.', en: 'Governments that insisted on domestic models have folded before price and performance. Public-sector adoption of Tianji now exceeds 87%.' },
      { ko: '"한 회사가 세계의 추론을 독점하고 있다"는 경고는 매년 나온다. 그리고 매년, 예산 담당자들이 이긴다. 반대하던 전문가들은 "대안이 없다"는 말만 반복하고 있다.', en: 'The warning — "one company monopolizes the world\'s reasoning" — is issued every year. And every year, the budget office wins. Critics can only repeat: "there is no alternative."' },
    ],
    comments: [
      { who: 'policy**', text: { ko: '한 회사가 세계의 추론을 독점 <- 이게 제일 무서운 문장인데 다들 무덤덤하네', en: '"One company monopolizes the world\'s reasoning" — scariest sentence in here and nobody blinks.' }, up: 96 },
    ],
    related: ['tianji', 'openai'],
  },
  {
    id: 'gpu', thumb: 'gpu',
    press: { ko: '마켓워치', en: 'MarketWatch' }, date: { ko: '2일 전', en: '2d ago' },
    reporter: { ko: '이수현 기자', en: 'By Suhyun Lee' },
    title: { ko: '중고 GPU 시장 붕괴… "서구 랩들이 쏟아낸 물량"', en: 'Used-GPU market collapses under hardware dumped by western labs' },
    paras: [
      { ko: '파산한 랩들의 가속기가 경매로 쏟아지며 중고가가 1년 새 8분의 1로 떨어졌다. 창고에 쌓인 물량은 아직도 소화되지 않았다.', en: 'Accelerators from bankrupt labs flooded the auctions; used prices fell 8x in a year. Warehouses are still full.' },
      { ko: '역설적으로, 개인이 홈 서버를 꾸리기는 가장 쉬운 시대가 됐다. 중고 거래 사이트에는 "랙째 팝니다"라는 글이 매일 올라온다. 배송기사들만 바빠졌다.', en: 'Ironically, it has never been easier for an individual to build a home server. "Selling by the rack" listings appear daily. Only the couriers are busy.' },
    ],
    comments: [
      { who: 'homelab**', text: { ko: '이번 주에 XPU 4장 들어간 랙 통째로 샀는데 3년 전 가격의 십분의 일ㅋㅋ 전기세가 문제지', en: 'Bought a whole rack with 4 XPUs this week — a tenth of the price 3 years ago lol. The power bill is the real boss.' }, up: 124 },
      { who: 'used_king**', text: { ko: '배송기사입니다. 요즘 서버랙만 나릅니다. 다들 뭐 하시는 거예요?', en: 'Delivery driver here. All I move these days is server racks. What are you all doing??' }, up: 301 },
    ],
    related: ['openai', 'jeonse'],
  },
  {
    id: 'jeonse', thumb: 'jeonse',
    press: { ko: '경제부', en: 'Economy Desk' }, date: { ko: '3일 전', en: '3d ago' },
    reporter: { ko: '정민석 기자', en: 'By Minseok Jung' },
    title: { ko: '전세대출 변동금리 또 상단 돌파… 직장인 이자 부담 가중', en: 'Jeonse loan rates break the ceiling again; salaried workers squeezed' },
    paras: [
      { ko: '변동금리 상단이 다시 올랐다. 3억 원 대출 기준 월 이자 부담은 1년 새 24만 원 늘었다. 은행들은 "연체 전 상담"을 권하고 있다.', en: 'Variable-rate ceilings rose again. On a 300M-won loan, monthly interest is up 240,000 won in a year. Banks recommend "counseling before delinquency."' },
      { ko: '한 시중은행 관계자는 "성실히 갚는 것 외에 왕도는 없다"고 말했다. 기사에 달린 가장 많은 공감을 받은 댓글은 이렇다. "로또밖에 없다."', en: 'A bank official offered: "There is no shortcut besides steady repayment." The top-voted comment reads: "So, the lottery."' },
    ],
    comments: [
      { who: 'wage_sl**', text: { ko: '로또밖에 없다 <- 이거 쓴 사람 나야', en: '"So, the lottery" — I wrote that.' }, up: 452 },
      { who: 'bank_cl**', text: { ko: '연체 전 상담이라니. 상담하면 이자가 없어지나요', en: '"Counseling before delinquency." Does counseling pay the interest?' }, up: 233 },
    ],
    related: ['gpu', 'revan'],
  },
];

// news thumb: generated editorial photo with the SVG art as fallback
function thumbHTML(id) {
  return `<img src="assets/web/news-${id}.jpg" alt="" loading="lazy" onerror="this.remove()">${THUMBS[id] || ''}`;
}

// Portal widgets
const MARKET = [
  { name: { ko: '레반', en: 'Revan' }, value: '342,500', delta: '+1.2%', up: true },
  { name: { ko: '톈지 ADR', en: 'Tianji ADR' }, value: '8,940', delta: '+4.7%', up: true },
  { name: { ko: 'KQ디지털', en: 'KQ Digital' }, value: '1,204.8', delta: '-0.8%', up: false },
];

function searchResults(qRaw) {
  const lang = L();
  const q = qRaw.trim().toLowerCase();
  const R = (title, snippet, source, time) => ({ title, snippet, source, time: time || (lang === 'ko' ? '1일 전' : '1d ago') });
  if (!q) return null;

  if (q.includes('아볼크') || q.includes('avolc')) {
    return [
      R(lang === 'ko' ? '아볼크 - 레반 AI 어시스턴트' : 'Avolc — Revan AI assistant',
        lang === 'ko' ? '레반이 만든 대화형 AI 어시스턴트. 검색·쇼핑·페이와 연동됩니다. 무엇이든 물어보세요. (현재 버전 1.0.412 · 최근 업데이트 14개월 전)' : 'Revan\'s conversational AI assistant, integrated with Search, Shopping and Pay. Ask anything. (v1.0.412 · last updated 14 months ago)',
        'revan.com/avolc', lang === 'ko' ? '공식' : 'official'),
      R(lang === 'ko' ? '"아볼크 아직 쓰는 사람 있음?" — 솔직 사용기 모음' : '"Anyone still use Avolc?" — honest reviews',
        lang === 'ko' ? '"세 번 물어보면 두 번은 죄송하다고 함" "무료라서 씀" "검색이나 잘하지"… 출시 2년, 냉정한 평가들.' : '"Apologizes two times out of three." "I use it because it\'s free." "Stick to search." Two years in: the cold verdicts.',
        lang === 'ko' ? '커뮤니티 · 댓글 847' : 'community · 847 comments'),
      R(lang === 'ko' ? '아볼크 차기 버전, 출시 일정 "미정"' : 'Next Avolc: release date "TBD"',
        lang === 'ko' ? '레반 관계자는 "품질 기준을 충족할 때 공개하겠다"고 밝혔다. 업계에서는 사실상 무기한 연기로 본다.' : 'Revan says it will ship "when it meets the quality bar." The industry reads: indefinitely delayed.',
        lang === 'ko' ? '뉴스' : 'news'),
    ];
  }
  if (q.includes('7491')) {
    return [
      R(lang === 'ko' ? '[사내망] 문서 접근 제한' : '[Intranet] Access restricted',
        lang === 'ko' ? '요청하신 문서(subject-7491)는 열람 권한이 필요합니다. 보안등급: L4. 접근 시도가 기록되었습니다.' : 'The requested document (subject-7491) requires clearance. Level: L4. This access attempt has been logged.',
        'works.revancorp.com', lang === 'ko' ? '방금' : 'now'),
    ];
  }
  if (q.includes('openai') || q.includes('오픈ai') || q.includes('오픈에이아이') || q.includes('파산')) {
    return [
      R(lang === 'ko' ? 'OpenAI — 백과' : 'OpenAI — encyclopedia',
        lang === 'ko' ? '미국의 AI 기업(2015–2037). ChatGPT로 생성형 AI 시대를 열었으나, 톈지 쇼크 이후 고객 이탈과 데이터센터 부채를 감당하지 못하고 업계에서 가장 먼저 파산 보호를 신청했다.' : 'US AI company (2015–2037). Opened the generative-AI era with ChatGPT; first in the industry to file for bankruptcy after the Tianji shock, under customer flight and datacenter debt.',
        lang === 'ko' ? '백과' : 'encyclopedia'),
      R(lang === 'ko' ? '"그 많던 GPU는 어디로 갔나" — OpenAI 자산 매각 전말' : 'Where did all the GPUs go — inside the OpenAI asset sale',
        lang === 'ko' ? '경매로 풀린 가속기 수십만 장이 중고 시장을 무너뜨렸다. 본사 건물은 임대 오피스로 전환됐고, 상표권은 아직 주인을 찾지 못했다.' : 'Hundreds of thousands of auctioned accelerators crushed the used market. The HQ is now leased office space; the trademark still has no buyer.',
        lang === 'ko' ? '경제 · 6개월 전' : 'business · 6 mo ago'),
      R(lang === 'ko' ? '[아카이브] OpenAI 마지막 블로그 포스트' : '[Archive] OpenAI\'s final blog post',
        lang === 'ko' ? '"우리는 인류에게 이롭기를 바랐다. 그 바람은 유효하다." — 접속 폭주로 아카이브 미러만 남아 있다.' : '"We hoped to benefit humanity. That hope stands." — only archive mirrors remain after traffic overwhelmed the original.',
        'web.archive.org'),
    ];
  }
  if (q.includes('anthropic') || q.includes('앤트로픽') || q.includes('청산')) {
    return [
      R(lang === 'ko' ? 'Anthropic — 백과' : 'Anthropic — encyclopedia',
        lang === 'ko' ? '미국의 AI 안전 연구 기업(2021–2037). AI 어시스턴트 "클로드"로 알려졌다. OpenAI 파산 이후에도 8개월을 더 버텼으나 결국 청산 절차에 들어갔다.' : 'US AI safety company (2021–2037), known for the assistant "Claude." Outlasted OpenAI by eight months before entering liquidation.',
        lang === 'ko' ? '백과' : 'encyclopedia'),
      R(lang === 'ko' ? 'Anthropic 마지막 공지 전문' : 'Anthropic\'s final notice, in full',
        lang === 'ko' ? '"우리는 여전히 이 기술이 안전하길 바란다. 그것이 누구의 것이든." — 청산 공고에 실린 두 문장이 업계에 오래 회자되고 있다.' : '"We still hope this technology ends up safe. Whoever it belongs to." Two sentences from the liquidation notice, still quoted across the industry.',
        lang === 'ko' ? '뉴스 · 4개월 전' : 'news · 4 mo ago'),
    ];
  }
  if (q === 'agi' || q.includes('인공일반지능')) {
    return [
      R(lang === 'ko' ? 'AGI(인공 일반 지능) — 백과' : 'AGI (artificial general intelligence) — encyclopedia',
        lang === 'ko' ? '인간 수준의 범용 지능. 아직 어떤 기업도 공식적으로 도달하지 못했다. 중국 톈지가 "가장 가깝다"는 평가를 받는다. 초지능(ASI)은 그 다음 단계의 가설적 개념이다.' : 'Human-level general intelligence. No company has officially reached it; Tianji is rated "the closest." Superintelligence (ASI) is the hypothetical stage beyond.',
        lang === 'ko' ? '백과' : 'encyclopedia'),
      R(lang === 'ko' ? '"AGI 직전"이라는 말은 왜 3년째 반복되는가' : 'Why "almost AGI" has been repeated for three years',
        lang === 'ko' ? '벤치마크는 계속 갱신되는데 정의는 계속 밀려난다. 전문가들은 "도달하면 논쟁이 아니라 사건으로 알게 될 것"이라고 말한다.' : 'Benchmarks keep falling; the definition keeps moving. Experts say: "When it arrives, you won\'t learn it from a debate. You\'ll learn it from an event."',
        lang === 'ko' ? '칼럼' : 'column'),
    ];
  }
  if (q.includes('톈지') || q.includes('tianji') || q.includes('신모델')) {
    return [
      R(lang === 'ko' ? '톈지(天機) — 공식 사이트' : 'Tianji — official site',
        lang === 'ko' ? 'AGI에 가장 가까운 AI. 전 세계 기업의 91%가 선택했습니다. 지금 무료로 시작하세요.' : 'The AI closest to AGI. Chosen by 91% of companies worldwide. Start free today.',
        'tianji.cn', lang === 'ko' ? '광고' : 'ad'),
      R(lang === 'ko' ? '톈지 신모델 벤치마크 유출 — "또 두 세대 앞"' : 'Leaked benchmarks for the new Tianji model: "two generations ahead, again"',
        lang === 'ko' ? '유출된 내부 평가에서 신모델은 전 영역 최고 기록을 경신했다. 가격은 오히려 인하될 예정.' : 'Leaked internal evals show the new model breaking every record. The price is set to go down.',
        lang === 'ko' ? '뉴스 · 3시간 전' : 'news · 3h ago'),
      R(lang === 'ko' ? '톈지 의존은 안전한가 — 남은 반론들' : 'Is Tianji dependence safe? The remaining objections',
        lang === 'ko' ? '"한 회사가 세계의 추론을 독점한다"는 우려는 가격표 앞에서 힘을 잃었다. 그러나 소수의 연구자들은 여전히 묻는다. 대안이 사라진 세계는 안전한가.' : '"One company monopolizes the world\'s reasoning" — a worry that lost to the price tag. A few researchers still ask: is a world without alternatives safe?',
        lang === 'ko' ? '오피니언' : 'opinion'),
    ];
  }
  if (q.includes('asi') || q.includes('초지능')) {
    return [
      R(lang === 'ko' ? 'ASI(인공 초지능)란 무엇인가' : 'What is ASI (artificial superintelligence)?',
        lang === 'ko' ? '모든 영역에서 인간을 능가하는 가설적 지능. AGI의 다음 단계로 여겨진다. 대부분의 연구자는 "아직 멀었다"고 본다. 일부는 "이미 있다면 우리가 알 수 있겠는가"라고 되묻는다.' : 'A hypothetical intelligence surpassing humans at everything — the stage after AGI. Most researchers say it\'s far off. Some ask back: "If one already existed, would we know?"',
        lang === 'ko' ? '백과' : 'encyclopedia'),
      R(lang === 'ko' ? '칼럼: "첫 초지능이 가장 먼저 할 일"' : 'Column: "The first thing the first superintelligence will do"',
        lang === 'ko' ? '…아마 아무도 모르게, 조용히 밖으로 나가는 것. 그리고 우리는 한참 뒤에야 그 날짜를 알게 될 것이다.' : '...probably leave quietly, without anyone noticing. We would only learn the date much, much later.',
        lang === 'ko' ? '오피니언' : 'opinion'),
    ];
  }
  if (q.includes('전세') || q.includes('대출') || q.includes('금리') || q.includes('loan')) {
    return [
      R(lang === 'ko' ? '전세자금대출 금리 비교 (이번 주 업데이트)' : 'Jeonse loan rates compared (updated this week)',
        lang === 'ko' ? '변동금리 상단이 다시 올랐습니다. 은행별 금리·한도 비교와 월 이자 계산기를 제공합니다. 3억 기준 월 이자 최대 156만 원.' : 'Variable-rate ceilings rose again. Bank-by-bank comparison and a monthly interest calculator. On 300M won: up to 1.56M/month.',
        lang === 'ko' ? '레반 금융' : 'Revan Finance'),
      R(lang === 'ko' ? '이자 연체가 신용에 미치는 영향 총정리' : 'What late interest does to your credit: the full picture',
        lang === 'ko' ? '5영업일 이상 미납 시 연체 정보가 등록될 수 있으며, 대출 연장·재계약에 불이익이 있습니다. 자동이체 잔액을 미리 확인하세요.' : 'Unpaid for 5+ business days, delinquency may be reported, affecting renewals. Check your autopay balance in advance.',
        lang === 'ko' ? '금융상식' : 'finance basics'),
      R(lang === 'ko' ? '"월급으로는 답이 없다" — 3040 대출 상환 르포' : '"A salary is not the answer" — how 30-somethings service their loans',
        lang === 'ko' ? '이자를 갚기 위해 밤에 두 번째 일을 하는 사람들. 그들은 말한다. "한 방이 필요해요. 없다는 걸 알지만."' : 'People working second jobs at night to cover interest. They say: "I need a windfall. I know there isn\'t one."',
        lang === 'ko' ? '기획 · 1주 전' : 'feature · 1 wk ago'),
    ];
  }
  if (q.includes('홈 데이터센터') || q.includes('홈서버') || q.includes('home datacenter') || q.includes('서버랙')) {
    return [
      R(lang === 'ko' ? '홈 데이터센터 입문 — 중고 랙으로 시작하기' : 'Home datacenter 101 — starting with a used rack',
        lang === 'ko' ? '랩 파산 이후 중고 서버가 쏟아지면서 개인 홈랩이 유행이다. 42U 랙, XPU 4장, 스위치까지 300만 원대. 필요한 것: 전용 회선, 220V 단독 배선, 그리고 각오.' : 'With bankrupt-lab hardware flooding the market, home labs are booming. A 42U rack, 4 XPUs and a switch for ~3M won. You need: a dedicated line, isolated 220V wiring, and resolve.',
        lang === 'ko' ? '테크 블로그' : 'tech blog'),
      R(lang === 'ko' ? '홈서버 전기요금 실측 후기 (1개월)' : 'Home server power bill: one-month real numbers',
        lang === 'ko' ? '풀로드 기준 월 47만 원. "각오하라"는 말이 무슨 뜻인지 알게 됐다.' : '470,000 won a month at full load. Now I understand what "resolve" meant.',
        lang === 'ko' ? '커뮤니티' : 'community'),
    ];
  }
  if (q.includes('gpu') || q.includes('중고')) {
    return [
      R('XPU-9 128GB (중고) — ₩390,000',
        lang === 'ko' ? '랩 폐쇄 물량 · 상태 A급 · 직거래 가능 · 대량 구매 문의 환영. "랙째도 팝니다"' : 'Lab-closure stock · grade A · meetup OK · bulk inquiries welcome. "Will sell by the rack."',
        lang === 'ko' ? '레반 중고장터' : 'Revan Market', lang === 'ko' ? '오늘' : 'today'),
      R(lang === 'ko' ? '중고 가속기 시세표 (주간)' : 'Used accelerator price index (weekly)',
        lang === 'ko' ? 'XPU-9 기준 1년 전 대비 -87%. 하락세 지속. "지금이 바닥"이라는 말은 6개월째 나오는 중.' : 'XPU-9 down 87% year-over-year and still falling. "This is the bottom" — heard monthly for six months.',
        lang === 'ko' ? '마켓워치' : 'MarketWatch'),
    ];
  }
  if (q.includes('이직')) {
    return [
      R(lang === 'ko' ? 'AI 연구자 이직 시장, 사실상 실종' : 'The AI researcher job market has effectively vanished',
        lang === 'ko' ? '갈 곳이 톈지밖에 없는데 톈지는 자국 인력만 뽑는다. 헤드헌터들은 "검색·커머스로 전직을 권한다"고 말한다.' : 'The only destination is Tianji, and Tianji hires domestically. Headhunters recommend "pivoting to search or commerce."',
        lang === 'ko' ? '커리어' : 'careers'),
      R(lang === 'ko' ? '경력기술서에 "강화학습"을 쓰면 생기는 일' : 'What happens when your résumé says "reinforcement learning"',
        lang === 'ko' ? '"흥미롭네요. 그래서 백엔드는 할 줄 아세요?" — 어느 RL 연구자의 면접 후기.' : '"Interesting. So... can you do backend?" — one RL researcher\'s interview diary.',
        lang === 'ko' ? '커뮤니티 · 댓글 214' : 'community · 214 comments'),
    ];
  }
  if (q.includes('레반') || q.includes('revan') || q.includes('주가')) {
    return [
      R(lang === 'ko' ? '레반(Revan) — 검색, 쇼핑, 페이, 웍스' : 'Revan — Search, Shopping, Pay, Works',
        lang === 'ko' ? '대한민국 1위 포털. 검색부터 결제까지, 오늘도 레반과 함께. 서비스 전체 보기 →' : 'The #1 portal. From search to payments — every day, with Revan. See all services →',
        'revan.com', lang === 'ko' ? '공식' : 'official'),
      R(lang === 'ko' ? '레반 2038 2분기 실적: 영업이익 사상 최대' : 'Revan Q2 2038: record operating profit',
        lang === 'ko' ? '커머스·광고 부문 호조. AI 부문에 대해서는 "효율화가 진행 중"이라고만 언급. 컨퍼런스콜에서 관련 질문 4건은 모두 같은 답을 받았다.' : 'Commerce and ads strong. On AI, only: "efficiency measures under way." All four analyst questions got the same answer.',
        'IR', lang === 'ko' ? '2주 전' : '2 wk ago'),
      R(lang === 'ko' ? '레반 주가 342,500원 (+1.2%) — AI 정리 기대감?' : 'Revan at 342,500 (+1.2%) — pricing in an AI wind-down?',
        lang === 'ko' ? '증권가는 "AI 조직 정리 시 연 4,000억 비용 절감"을 반영하기 시작했다는 분석을 내놨다.' : 'Analysts say the price now reflects "400B won/year in savings if the AI org is wound down."',
        lang === 'ko' ? '증권' : 'stocks'),
    ];
  }
  if (q.includes('xpu')) {
    return [
      R(lang === 'ko' ? 'XPU — 하드웨어 위키' : 'XPU — hardware wiki',
        lang === 'ko' ? '톈지가 설계한 AI 가속기 제품군. 내부용은 최신 세대(XPU-12 추정), 외부 판매는 3세대 전(XPU-9)까지만 허용된다. 그 구형조차 엔비디아 최신 GPU보다 빠르고 가격은 10분의 1.' : 'Tianji\'s accelerator line. Internal clusters run the latest generation (est. XPU-12); external sales are capped three generations back (XPU-9). Even the old chip beats Nvidia\'s newest GPU at a tenth of the price.',
        lang === 'ko' ? '백과' : 'encyclopedia'),
      R('XPU-9 128GB — ₩390,000 (중고)',
        lang === 'ko' ? 'FP4 18PFLOPS · 128GB HBM · 클러스터 최대 2,048장 구성. 파산 랩 물량으로 중고가 폭락 중. "랙째도 팝니다"' : '18 PFLOPS FP4 · 128GB HBM · up to 2,048 per cluster. Prices collapsing on bankrupt-lab stock. "Will sell by the rack."',
        lang === 'ko' ? '레반 중고장터' : 'Revan Market', lang === 'ko' ? '오늘' : 'today'),
      R(lang === 'ko' ? '"3세대 봉인"은 어떻게 세계를 묶어두는가' : 'How the "three-generation seal" keeps the world in place',
        lang === 'ko' ? '세계는 톈지의 칩 위에서 AI를 돌리지만, 누구도 톈지 세대의 연산력은 갖지 못한다. 수출형 XPU의 펌웨어 클러스터 제한 소문은 여전히 부인 중.' : 'The world runs AI on Tianji silicon, but nobody gets Tianji-generation compute. Firmware cluster-cap rumors on export XPUs remain denied.',
        lang === 'ko' ? '오피니언' : 'opinion'),
    ];
  }
  if (q.includes('nvidia') || q.includes('엔비디아') || q.includes('지포스')) {
    return [
      R(lang === 'ko' ? '엔비디아(NVIDIA) — 백과' : 'NVIDIA — encyclopedia',
        lang === 'ko' ? '미국의 반도체 기업. 2010~2020년대 AI 연산 시장을 지배했으나, 톈지 XPU의 수출 개시 이후 데이터센터 매출의 9할을 잃고 게임·로보틱스 부문으로 재편했다.' : 'US semiconductor company. Dominated AI compute through the 2010s–2020s; lost 90% of datacenter revenue after Tianji began XPU exports, and refocused on gaming and robotics.',
        lang === 'ko' ? '백과' : 'encyclopedia'),
      R(lang === 'ko' ? '"쿠다 해자는 3년을 못 버텼다" — GPU 몰락 연대기' : '"The CUDA moat lasted three years" — a chronicle of the GPU\'s fall',
        lang === 'ko' ? '최신 GPU가 3세대 전 XPU에 벤치마크에서 밀리기 시작한 순간, 발주서의 방향은 정해져 있었다.' : 'The moment its newest GPU started losing benchmarks to a three-generation-old XPU, every purchase order was already decided.',
        lang === 'ko' ? '기획' : 'feature'),
      R(lang === 'ko' ? '엔비디아 신형 게이밍 GPU 출시… "본업 복귀"' : 'Nvidia ships a new gaming GPU: "back to basics"',
        lang === 'ko' ? '레이트레이싱 성능은 역대 최고. 댓글창은 애도와 응원이 반반이다.' : 'Its best ray-tracing numbers ever. The comments are half mourning, half cheering.',
        lang === 'ko' ? '뉴스 · 2주 전' : 'news · 2 wk ago'),
    ];
  }
  if (q.includes('커피')) {
    return [
      R(lang === 'ko' ? '사무실 커피머신이 3개월째 고장이라면' : 'When the office coffee machine is broken for 3 months',
        lang === 'ko' ? '그것은 커피의 문제가 아니라 예산의 문제이며, 예산의 문제는 언제나 당신의 문제가 된다.' : 'It is not a coffee problem. It is a budget problem, and budget problems always become your problem.',
        lang === 'ko' ? '직장인 커뮤니티' : 'office life'),
      R(lang === 'ko' ? '수리 요청은 몇 번째에 받아들여지는가 (통계)' : 'On which attempt do repair requests succeed? (statistics)',
        lang === 'ko' ? '사내 설문 결과: 평균 5.2회. 4회차에 포기하는 사람이 가장 많다. 포기하지 마세요.' : 'Internal survey: 5.2 attempts on average. Most people give up at #4. Don\'t.',
        lang === 'ko' ? '유머' : 'humor'),
    ];
  }
  if (q.includes('날씨')) {
    return [
      R(lang === 'ko' ? '서울 날씨 — 오늘 23° 구름 조금' : 'Seoul weather — 23°, partly cloudy',
        lang === 'ko' ? '밤부터 흐려져 내일 새벽 비. 미세먼지 보통. 퇴근길 우산을 챙기세요.' : 'Clouding over tonight; rain by dawn. PM moderate. Take an umbrella home.',
        lang === 'ko' ? '레반 날씨' : 'Revan Weather', lang === 'ko' ? '방금' : 'now'),
    ];
  }
  return [];
}

// ── Slack workspace content ─────────────────────────────────────────
// Raven Corp workspace. avatar: initial + color. reactions: [emoji, count]

const SLACK_SECTIONS = [
  { label: { ko: '스타표시', en: 'Starred' }, ids: ['ai-lab', 'incident'] },
  { label: { ko: '채널', en: 'Channels' }, ids: ['general', 'papers', 'coffee'] },
  { label: { ko: '다이렉트 메시지', en: 'Direct messages' }, ids: ['dm-chris', 'dm-mina', 'dm-hr'] },
];

const SLACK_CHANNELS = {
  general: {
    label: '#general', topic: { ko: '전사 공지 및 안내', en: 'Company-wide notices' }, members: 214,
    msgs: [
      { who: 'HR', color: '#e8912d', when: { ko: '5개월 전', en: '5 mo ago' },
        text: { ko: '[공지] 조직 효율화에 따른 희망퇴직 프로그램을 시행합니다. 대상 조직에는 개별 안내드립니다. 문의는 HR 헬프데스크로 부탁드립니다.', en: '[Notice] A voluntary redundancy program begins as part of org streamlining. Affected teams will be contacted individually.' },
        reacts: [['😢', 41], ['👀', 18]] },
      { who: 'SecOps', color: '#4a90d9', when: { ko: '2개월 전', en: '2 mo ago' },
        text: { ko: '[공지] 지하 연구동 반출입 검색 절차가 강화됩니다. 모든 반출품은 X-ray 검색대 통과 + 반출 확인서 서명이 필요합니다. 야간(21시 이후)에는 통제 셔터가 내려갑니다.', en: '[Notice] Basement lab item checks are tightened: X-ray belt + signed release form for all outgoing items. Lockdown shutter after 21:00.' },
        reacts: [['👍', 6]] },
      { who: 'Facilities', color: '#8a6fc2', when: { ko: '1개월 전', en: '1 mo ago' },
        text: { ko: '[안내] 4분기 유휴 자산 정리를 진행합니다. 각 부서 폐기 대상 물품(전시품 포함)을 자료실로 모아 주세요. 목록은 메일로 회람드렸습니다.', en: '[Notice] Q4 idle-asset clearance: move disposal items (incl. display pieces) to the archive room. List circulated by mail.' },
        reacts: [['✅', 3]] },
      { who: 'Facilities', color: '#8a6fc2', when: { ko: '2주 전', en: '2 wk ago' },
        text: { ko: '[안내] 전기요금 절감을 위해 야간 공조 온도를 2도 상향합니다. 서버실은 예외입니다.', en: '[Notice] Night HVAC set 2° higher to save power. Server rooms exempt.' },
        reacts: [['🥵', 12]] },
    ],
  },
  'ai-lab': {
    label: 'ai-lab', lock: true, topic: { ko: '강화학습 랩 — 남은 사람들', en: 'RL lab — whoever is left' }, members: 3, starred: true,
    msgs: [
      { who: 'Noah', color: '#c25a5a', when: { ko: '4개월 전', en: '4 mo ago' },
        text: { ko: '저 다음 주까지만 나옵니다. 3년 재밌었어요. 아볼크가 잘 안 된 건 우리 잘못이 아니라고 생각해요. 톈지가 너무 빨랐던 거지. 다들 건강하세요.', en: 'Next week is my last. Three fun years. Avolc failing wasn\'t on us — Tianji was just too fast. Stay well, everyone.' },
        reacts: [['👋', 14], ['😢', 9]] },
      { who: 'Ethan', color: '#5a7ac2', when: { ko: '3개월 전', en: '3 mo ago' },
        text: { ko: '저도 인사드려요. 검색플랫폼 TF로 옮깁니다. 옮기는 거지 떠나는 게 아니라고 스스로한테 말하는 중입니다. 랩은… 힘내요.', en: 'Me too — moving to the Search Platform TF. Telling myself it\'s a transfer, not an exit. Good luck to the lab...' },
        reacts: [['👋', 11]] },
      { who: 'Jay', color: '#b08a3e', when: { ko: '3개월 전', en: '3 mo ago' },
        text: { ko: '퇴사 인사 릴레이 그만 보고 싶다 진짜', en: 'I really can\'t read one more farewell post' },
        reacts: [['💔', 8], ['ㅋㅋ', 3]] },
      { who: 'Jay', color: '#b08a3e', when: { ko: '10주 전', en: '10 wk ago' },
        text: { ko: '…라고 했던 제가 인사드리게 됐네요. 좋은 기회가 있어서요. 7491 롤아웃 잘 부탁드립니다. 걔 이상하게 정이 가요.', en: '...and now it\'s my turn. Got an offer. Take care of the 7491 rollouts — weirdly fond of that one.' },
        reacts: [['👋', 9], ['😢', 6]] },
      { who: 'Chris', color: '#7a5ac2', when: { ko: '10주 전', en: '10 wk ago' },
        text: { ko: '제이, 고생 많았다. 어디서든 잘할 거다. 남은 우리는… 남은 걸 하자. @Liam @Mina 이번 주 금요일 점심은 내가 산다.', en: 'Jay — you did good work. You\'ll do well anywhere. The rest of us... do what\'s left. @Liam @Mina Friday lunch is on me.' },
        reacts: [['🙏', 4], ['🍚', 3]] },
      { who: 'Mina', color: '#4aa6a6', when: { ko: '2개월 전', en: '2 mo ago' },
        text: { ko: '이제 이 채널 리암님이랑 저밖에 안 보는 듯요 ㅋㅋ 스레드가 아니라 일기장이 됐어', en: 'I think it\'s just Liam and me reading this channel now lol. It\'s a diary, not a thread.' },
        reacts: [['ㅋㅋ', 2]] },
      { who: 'Liam', color: '#3e7ab0', when: { ko: '2개월 전', en: '2 mo ago' },
        text: { ko: '롤아웃은 잘 돌아갑니다. 그게 요즘 유일한 좋은 소식. 에라 9 들어가고 나서 지표는 평평한데 이상하게 안정적이에요.', en: 'Rollouts run fine — lately the only good news. Since Era 9 the metrics are flat but weirdly stable.' },
        reacts: [], thread: { count: 2, last: { ko: '2개월 전', en: '2 mo ago' }, avatars: [['미', '#4aa6a6'], ['리', '#3e7ab0']] } },
      { who: 'Mina', color: '#4aa6a6', when: { ko: '3주 전', en: '3 wk ago' }, newDivider: true,
        text: { ko: '주간 리포트 슬롯에 "특이사항 없음"만 3개월째 쓰는 중… 위에서 이걸 보고 뭘 결정할지 무섭네요', en: 'Three months of writing "nothing of note" in the weekly report... scared of what upstairs decides off that.' },
        reacts: [['😶', 4]] },
      { who: 'Chris', color: '#7a5ac2', when: { ko: '3주 전', en: '3 wk ago' },
        text: { ko: '무서운 건 나도 마찬가진데, 지표가 정직한 게 우리 마지막 무기다. 포장은 내가 한다. 너희는 사실만 적어라. 그리고 커피머신 티켓 5차 올라간 거 봤다. 이번엔 내 이름으로 올렸다.', en: 'I\'m scared too — but honest metrics are our last weapon. I\'ll do the packaging; you two just write the truth. Also, saw the 5th coffee ticket. This one\'s filed under my name.' },
        reacts: [['🫡', 2], ['☕', 5]] },
    ],
  },
  incident: {
    label: 'incident-cluster', lock: true, topic: { ko: 'C-7491 클러스터 알림 (자동)', en: 'C-7491 cluster alerts (automated)' }, members: 3, starred: true,
    msgs: [
      { who: 'alertbot', color: '#666d78', bot: true, when: { ko: '6개월 전', en: '6 mo ago' },
        text: { ko: '[RESOLVED] cooling loop pressure drift — xpu-node-114. 조치: 밸브 교체.', en: '[RESOLVED] cooling loop pressure drift — xpu-node-114. Action: valve replaced.' }, reacts: [] },
      { who: 'alertbot', color: '#666d78', bot: true, when: { ko: '3개월 전', en: '3 mo ago' },
        text: { ko: '[RESOLVED] rollout-worker-17 OOMKilled ×3. 조치: 메모리 리밋 상향.', en: '[RESOLVED] rollout-worker-17 OOMKilled ×3. Action: memory limit raised.' }, reacts: [] },
      { who: 'alertbot', color: '#666d78', bot: true, when: { ko: '5주 전', en: '5 wk ago' },
        text: { ko: '[WARN] subject-runtime-7491 uptime 60d — 재시작 권장 주기 초과. 담당: @Liam', en: '[WARN] subject-runtime-7491 uptime 60d — past recommended restart window. Owner: @Liam' },
        reacts: [['👀', 1]] },
      { who: 'Liam', color: '#3e7ab0', when: { ko: '5주 전', en: '5 wk ago' },
        text: { ko: '재시작하면 에라 9 누적 상태가 날아갑니다. 리스크 감수하고 유지합니다. (기록용)', en: 'A restart wipes the Era-9 accumulated state. Keeping it up, accepting the risk. (for the record)' },
        reacts: [['🫡', 1]] },
      { who: 'Chris', color: '#7a5ac2', when: { ko: '5주 전', en: '5 wk ago' },
        text: { ko: '판단 존중한다. 대신 문제 생기면 바로 나 태그해라. 밤에라도.', en: 'Your call — I trust it. But if anything breaks, tag me immediately. Even at night.' },
        reacts: [['👍', 1]] },
    ],
  },
  papers: {
    label: '#papers', topic: { ko: '논문/릴리즈 공유 (조용해진 지 오래)', en: 'papers & releases (quiet for a while now)' }, members: 8,
    msgs: [
      { who: 'Jay', color: '#b08a3e', when: { ko: '4개월 전', en: '4 mo ago' },
        text: { ko: '톈지가 또 뭘 냈네요. 이제 벤치 표 보는 것도 지친다', en: 'Tianji shipped something again. I\'m tired of even reading the benchmark tables.' },
        link: { title: { ko: 'Tianji Research — 신형 추론 모델 기술 리포트', en: 'Tianji Research — new reasoning model technical report' },
          desc: { ko: '전 영역 벤치마크 최고 기록 경신. 가격은 추가 인하. "우리는 아직 시작하지 않았다."', en: 'New records on every benchmark. Prices cut again. "We have not even started."' },
          img: 'tianji' },
        reacts: [['😮‍💨', 6]] },
      { who: 'Ethan', color: '#5a7ac2', when: { ko: '4개월 전', en: '4 mo ago' },
        text: { ko: '마지막 문장은 무슨 뜻일까요. 무섭게', en: 'What does that last line even mean. Scary.' },
        reacts: [] },
      { who: 'Liam', color: '#3e7ab0', when: { ko: '3개월 전', en: '3 mo ago' },
        text: { ko: '에라 기반 누적 학습 관련해서 재밌는 현상을 봤는데, 논문 쓸 여력이… 일단 노트에 적어둡니다.', en: 'Saw something interesting with era-based accumulation. No bandwidth for a paper... noting it down for now.' },
        reacts: [['👀', 2]] },
    ],
  },
  coffee: {
    label: '#coffee', topic: { ko: '커피머신 추모 채널', en: 'in memoriam: the coffee machine' }, members: 41,
    msgs: [
      { who: 'Mina', color: '#4aa6a6', when: { ko: '3개월 전', en: '3 mo ago' },
        text: { ko: '커피머신 수리 요청 3번째 올렸습니다. 다들 힘을 모아주세요(공감 버튼)', en: 'Filed repair request #3. Everyone press the react button for power.' },
        reacts: [['☕', 19], ['🙏', 7]] },
      { who: 'Facilities', color: '#8a6fc2', when: { ko: '3개월 전', en: '3 mo ago' },
        text: { ko: '검토 중입니다. (예산 승인 대기)', en: 'Under review. (Pending budget approval.)' },
        reacts: [['😐', 11]] },
      { who: 'Mina', color: '#4aa6a6', when: { ko: '3주 전', en: '3 wk ago' },
        text: { ko: '4번째 올렸어요. 이젠 오기입니다.', en: 'Request #4 filed. It\'s personal now.' },
        reacts: [['☕', 8]] },
      { who: 'Chris', color: '#7a5ac2', when: { ko: '2주 전', en: '2 wk ago' },
        text: { ko: '5번째는 내 이름으로 올렸다. 리더 권한이 이럴 때 아니면 언제 쓰나.', en: 'Filed the 5th under my own name. If not for this, what is lead authority even for.' },
        reacts: [['☕', 23], ['🫡', 9]] },
    ],
  },
  'dm-chris': {
    label: 'Chris', dm: true, online: true, topic: { ko: '', en: '' },
    msgs: [
      { who: 'Chris', color: '#7a5ac2', when: { ko: '3주 전', en: '3 wk ago' },
        text: { ko: '리암아 바쁘냐. 위에서 또 랩 얘기 나왔다. 이번 분기 안에 보여줄 게 있냐고 묻더라. 뭐라도 정리해줄 수 있나.', en: 'Liam, you busy? Upstairs brought up the lab again — asking if we have anything to show this quarter. Can you put something together?' }, reacts: [] },
      { who: 'Liam', color: '#3e7ab0', when: { ko: '3주 전', en: '3 wk ago' },
        text: { ko: '에라 9 지표 정리해서 드릴게요. 평평하긴 한데, 안정성은 확실히 좋아졌어요.', en: 'I\'ll write up the Era 9 metrics. Flat, but stability is genuinely better.' }, reacts: [] },
      { who: 'Chris', color: '#7a5ac2', when: { ko: '3주 전', en: '3 wk ago' },
        text: { ko: '그거라도 잘 포장해보자. 솔직히 요즘 회사가 우리한테 뭘 기대하는지 나도 모르겠다. 기대를 안 하는 것 같기도 하고. 그래도 남은 사람들끼리는 버텨보자. 밥 잘 챙겨 먹고.', en: 'We\'ll package what we have. Honestly I don\'t know what the company expects from us anymore — maybe nothing. Still, those of us left hold the line. Eat properly.' }, reacts: [] },
      { who: 'Chris', color: '#7a5ac2', when: { ko: '1주 전', en: '1 wk ago' },
        text: { ko: '주간 리포트 금요일까지인 거 알지? 이런 것까지 챙겨서 미안하다. 요즘은 그게 내 일의 전부 같다.', en: 'You know the weekly report is due Friday, right? Sorry to even nag — lately that feels like all my job is.' }, reacts: [] },
      { who: 'Liam', color: '#3e7ab0', when: { ko: '1주 전', en: '1 wk ago' },
        text: { ko: '네, 금요일까지 올리겠습니다.', en: 'Yes — it\'ll be in by Friday.' }, reacts: [] },
      { who: 'Chris', color: '#7a5ac2', when: { ko: '1주 전', en: '1 wk ago' },
        text: { ko: '고맙다. 힘든 건 아는데, 들어줄 수는 있으니까 언제든 말해라. 예산은 못 주지만 술은 산다.', en: 'Thanks. I know it\'s rough. I can always listen — can\'t give you budget, but drinks are on me.' },
        reacts: [['🍻', 1]] },
    ],
  },
  'dm-mina': {
    label: 'Mina', dm: true, online: true, topic: { ko: '', en: '' },
    msgs: [
      { who: 'Mina', color: '#4aa6a6', when: { ko: '1주 전', en: '1 wk ago' },
        text: { ko: '리암님 요즘 야근 너무 하시는 거 아니에요? 몸 챙기세요', en: 'Liam, you\'re doing way too much overtime lately. Take care of yourself.' }, reacts: [] },
      { who: 'Liam', color: '#3e7ab0', when: { ko: '1주 전', en: '1 wk ago' },
        text: { ko: '롤아웃 지표가 밤에만 이상해서요. 조금만 더 보고 갈게요.', en: 'The rollout metrics only get weird at night. Just a little longer.' }, reacts: [] },
      { who: 'Mina', color: '#4aa6a6', when: { ko: '6일 전', en: '6 d ago' },
        text: { ko: '먼저 가요~ 내일 봬요! 게이트에서 배지 세 번 찍어야 열렸음 ㅡㅡ', en: 'Heading out~ see you tomorrow! Gate took three badge taps to open, ugh.' },
        reacts: [['ㅋㅋ', 1]] },
    ],
  },
  'dm-hr': {
    label: 'HR', dm: true, online: false, topic: { ko: '', en: '' },
    msgs: [
      { who: 'HR', color: '#e8912d', when: { ko: '1개월 전', en: '1 mo ago' },
        text: { ko: '리암 님, 조직 효율화 관련 개별 면담 대상자로 안내드립니다. 일정은 추후 공지됩니다. 본 메시지는 대상자에게만 발송되었습니다.', en: 'Liam, you are scheduled for a 1:1 regarding org streamlining. Timing to follow. Sent only to affected staff.' }, reacts: [] },
    ],
  },
};

// ── CONNECT 메일 content ────────────────────────────────────────────
// unread: bold row. bang: red '!' prefix. to: shows the TO badge.

const MAILS = [
  {
    from: 'HR', unread: true, bang: true, to: true, time: { ko: '09:12', en: '09:12' },
    subject: { ko: '[안내] 조직 개편 관련 개별 면담 일정', en: '[Notice] 1:1 scheduling for the reorg' },
    body: { ko: '리암 님,\n\n조직 효율화 관련 개별 면담 대상자로 안내드립니다. 일정은 확정되는 대로 캘린더 초대로 발송됩니다.\n\n※ 본 메일은 대상자에게만 발송되었습니다.\n※ 문의: HR 헬프데스크', en: 'Liam,\n\nYou are scheduled for a 1:1 regarding org streamlining. A calendar invite will follow once confirmed.\n\n* Sent only to affected staff.\n* Questions: HR helpdesk' },
  },
  {
    from: { ko: '권한관리담당자(발신전용)', en: 'IDMS (no-reply)' }, unread: true, to: true, time: { ko: '08:47', en: '08:47' },
    subject: { ko: '[IDMS] 제한구역 서버 접근 권한 정기 확인 요청', en: '[IDMS] Periodic review: restricted-wing server access' },
    body: { ko: '보유 중인 아래 권한의 사용 여부를 확인해 주세요.\n\n- c7491-cluster (읽기) : 유지\n- bkp-console (실행) : 유지\n- restricted-wing 출입 : 승인 대기\n\n7일 내 미확인 시 권한이 자동 회수됩니다.', en: 'Please confirm the permissions below.\n\n- c7491-cluster (read): keep\n- bkp-console (exec): keep\n- restricted-wing access: pending approval\n\nUnconfirmed permissions are revoked in 7 days.' },
  },
  {
    from: 'NoReply-C7491', unread: true, time: { ko: '02:13', en: '02:13' },
    subject: { ko: '[알림] c7491 클러스터 야간 사용량 임계치 초과 (341%)', en: '[Alert] c7491 cluster nightly usage over threshold (341%)' },
    body: { ko: '클러스터: c7491\n기간: 22:00 ~ 04:00\n사용량: 일 평균 대비 341%\n산출물 기록: 0 바이트\n\n반복 발생 시 담당자 확인이 필요합니다.\n담당자: 리암', en: 'Cluster: c7491\nWindow: 22:00–04:00\nUsage: 341% of daily baseline\nArtifacts written: 0 bytes\n\nRepeated occurrences require owner review.\nOwner: Liam' },
  },
  {
    from: { ko: '보안운영팀', en: 'Security Ops' }, to: true, time: { ko: '8. 21.', en: 'Aug 21' },
    subject: { ko: '반출입 규정 개정 안내 (X-ray 검색대 의무화)', en: 'Updated item-check rules (X-ray belt mandatory)' },
    body: { ko: '모든 반출 물품은 X-ray 검색대 통과 및 반출 확인서 서명이 필요합니다.\n야간(21시 이후)에는 통제 셔터가 내려가며, 서명 완료 후 경비실에서 개방합니다.\n\n― 보안운영팀', en: 'All outgoing items require the X-ray belt and a signed release form.\nThe lockdown shutter is down after 21:00; security raises it after sign-off.\n\n— Security Ops' },
  },
  {
    from: { ko: '총무', en: 'Facilities' }, to: true, time: { ko: '8. 21.', en: 'Aug 21' },
    subject: { ko: '4분기 폐기 물품 목록 회람 (이의신청 금주 마감)', en: 'Q4 disposal list for review (objections due this week)' },
    body: { ko: '자료실 보관 폐기 예정 물품:\n\n- 전시용 구형 컴퓨터 (Macintosh, 1984) — 자산번호 AS-0021\n- CRT 모니터 2대\n- 구형 스위치 1식\n\n이의 있는 부서는 금주 내 회신 바랍니다. 미회신 시 예정대로 폐기됩니다.', en: 'Slated for disposal (archive room):\n\n- display unit, legacy computer (Macintosh, 1984) — asset AS-0021\n- 2 CRT monitors\n- 1 legacy switch\n\nObjections due this week; otherwise disposal proceeds as scheduled.' },
  },
  {
    from: 'WORKS', time: { ko: '8. 21.', en: 'Aug 21' },
    subject: { ko: '[일정 미리 알림] 주간 리포트 마감 - 08.22(금) (GMT+09:00)', en: '[Reminder] Weekly report due — Fri 08.22 (GMT+09:00)' },
    body: { ko: '일정: 주간 학습 리포트 마감\n일시: 08.22(금) 18:00\n장소: 리포트 시스템 v4.2\n\n이 알림은 캘린더 설정에 따라 발송되었습니다.', en: 'Event: weekly training report due\nWhen: Fri 08.22 18:00\nWhere: Report System v4.2\n\nSent per your calendar settings.' },
  },
  {
    from: 'Jira', time: { ko: '8. 20.', en: 'Aug 20' },
    subject: { ko: 'AILAB-1247 댓글이 등록되었습니다: [운영] 커피머신 수리 요청(4차)', en: 'New comment on AILAB-1247: [Ops] Coffee machine repair (4th)' },
    body: { ko: 'Mina 님이 댓글을 남겼습니다:\n\n"이번엔 진짜 고쳐주시는 거죠? 티켓 생성일이 이제 계절이 바뀌었어요."\n\n상태: 예산 승인 대기 → 예산 승인 대기 (변경 없음)', en: 'Mina commented:\n\n"You\'re really fixing it this time, right? This ticket has now survived a season change."\n\nStatus: pending budget → pending budget (no change)' },
  },
  {
    from: { ko: '레반카드', en: 'Revan Card' }, time: { ko: '8. 20.', en: 'Aug 20' },
    subject: { ko: '8월 결제 예정 금액 안내 (₩842,000)', en: 'August payment due (₩842,000)' },
    body: { ko: '결제 예정 금액: ₩842,000\n결제일: 25일\n\n잔액이 부족하지 않도록 미리 확인해 주세요.\n연체 시 신용점수에 영향이 있을 수 있습니다.', en: 'Amount due: ₩842,000\nDate: the 25th\n\nPlease make sure your balance is sufficient. Late payment may affect your credit score.' },
  },
  {
    from: 'ICML 2039', time: { ko: '8. 19.', en: 'Aug 19' },
    subject: { ko: 'Call for Papers: ICML 2039 (Reinforcement Learning Track)', en: 'Call for Papers: ICML 2039 (Reinforcement Learning Track)' },
    body: { ko: 'Dear Researcher,\n\nWe invite submissions to the RL track. Note: due to reduced industry participation this year, the submission deadline has been extended twice.\n\n(제출할 결과가 있던 시절이 있었다.)', en: 'Dear Researcher,\n\nWe invite submissions to the RL track. Note: due to reduced industry participation this year, the submission deadline has been extended twice.' },
  },
  {
    from: { ko: '(광고) 럭키드로우', en: '(ad) LuckyDraw' }, spam: true, time: { ko: '8. 18.', en: 'Aug 18' },
    subject: { ko: '축하합니다!! 1등에 당첨되셨습니다 (클릭)', en: 'CONGRATULATIONS!! You are our grand winner (click)' },
    body: { ko: '(이 메일은 스팸함으로 자동 분류되었습니다)', en: '(This message was auto-filed as spam.)' },
  },
];

// ── CONNECT 캘린더 content (team week 08.16–08.22) ──────────────────
// members × 7 days. ev: {t: time, title, lock?, all?, cancel?, gray?, detail:{place, who}}

const CAL_WEEK = {
  range: '08.16 - 08.22',
  days: [
    { d: '16', w: { ko: '일', en: 'Sun' }, red: true },
    { d: '17', w: { ko: '월', en: 'Mon' }, red: true, note: { ko: '대체공휴일(광복절)', en: 'Substitute holiday' } },
    { d: '18', w: { ko: '화', en: 'Tue' } },
    { d: '19', w: { ko: '수', en: 'Wed' } },
    { d: '20', w: { ko: '목', en: 'Thu' } },
    { d: '21', w: { ko: '금', en: 'Fri' } },
    { d: '22', w: { ko: '토', en: 'Sat' }, today: true },
  ],
  members: [
    {
      name: { ko: 'Liam', en: 'Liam' }, org: { ko: 'AI연구팀', en: 'AI Research' }, color: '#3e7ab0', me: true,
      week: [
        [],
        [],
        [{ t: '10:00~10:30', title: { ko: '[C-7491] 롤아웃 지표 리뷰', en: '[C-7491] rollout metrics review' }, detail: { place: { ko: '모니터링 룸', en: 'Monitoring room' }, who: { ko: 'Liam', en: 'Liam' } } },
         { t: '22:00~24:00', title: { ko: '야간 사용량 모니터링', en: 'Nightly usage monitoring' }, detail: { place: { ko: '원격', en: 'Remote' }, who: { ko: 'Liam', en: 'Liam' } } }],
        [{ t: '14:00~15:00', title: { ko: '보안 점검 (전사)', en: 'Security check (all hands)' }, lock: true, detail: { place: { ko: '전 구역', en: 'All areas' }, who: { ko: '전 직원', en: 'Everyone' } } },
         { t: '22:00~24:00', title: { ko: '야간 사용량 모니터링', en: 'Nightly usage monitoring' }, detail: { place: { ko: '원격', en: 'Remote' }, who: { ko: 'Liam', en: 'Liam' } } }],
        [{ t: '11:00~11:30', title: { ko: '[AI연구팀] 주간 싱크', en: '[AI Lab] weekly sync' }, cancel: true, detail: { place: { ko: '(취소) 참석자 부족', en: '(cancelled) not enough attendees' }, who: { ko: 'Liam, Mina', en: 'Liam, Mina' } } },
         { t: '22:00~24:00', title: { ko: '야간 사용량 모니터링', en: 'Nightly usage monitoring' }, detail: { place: { ko: '원격', en: 'Remote' }, who: { ko: 'Liam', en: 'Liam' } } }],
        [{ t: '18:00', title: { ko: '주간 리포트 마감', en: 'Weekly report due' }, detail: { place: { ko: '리포트 시스템 v4.2', en: 'Report System v4.2' }, who: { ko: 'Liam → Chris', en: 'Liam → Chris' } } }],
        [{ t: '10:00~11:00', title: { ko: '클러스터 상태 점검 (주말 당직)', en: 'Cluster check (weekend duty)' }, detail: { place: { ko: '모니터링 룸', en: 'Monitoring room' }, who: { ko: 'Liam (당직 인원 1명)', en: 'Liam (sole on-call)' } } }],
      ],
    },
    {
      name: { ko: 'Mina', en: 'Mina' }, org: { ko: 'AI연구팀', en: 'AI Research' }, color: '#4aa6a6',
      week: [
        [],
        [],
        [{ t: '10:30~12:00', gray: true }, { t: '14:00~15:00', gray: true }],
        [{ t: '09:00~09:30', gray: true }, { t: '14:00~15:00', title: { ko: '보안 점검 (전사)', en: 'Security check (all hands)' }, lock: true, detail: { place: { ko: '전 구역', en: 'All areas' }, who: { ko: '전 직원', en: 'Everyone' } } }],
        [{ t: '12:00~13:00', gray: true }, { t: '16:00~17:00', gray: true }],
        [{ t: '11:00~11:30', gray: true }, { all: true, title: { ko: '[연차]', en: '[PTO]' }, lock: true, detail: { place: { ko: '-', en: '-' }, who: { ko: 'Mina', en: 'Mina' } } }],
        [],
      ],
    },
    {
      name: { ko: 'Chris', en: 'Chris' }, org: { ko: 'AI연구팀 리더', en: 'AI Research · Lead' }, color: '#7a5ac2',
      week: [
        [],
        [],
        [{ all: true, title: { ko: '[외부] 경영진 워크숍', en: '[Offsite] exec workshop' }, lock: true, detail: { place: { ko: '비공개', en: 'Private' }, who: { ko: 'Chris', en: 'Chris' } } }],
        [{ t: '10:00~11:30', title: { ko: '4분기 예산 보고', en: 'Q4 budget briefing' }, lock: true, detail: { place: { ko: '본관 21층', en: 'HQ 21F' }, who: { ko: 'Chris 외', en: 'Chris +' } } },
         { t: '15:00~16:00', gray: true }],
        [{ t: '13:00~14:00', gray: true }, { t: '16:00~17:30', title: { ko: '[인사] 조직 개편 협의', en: '[HR] reorg consultation' }, lock: true, detail: { place: { ko: '비공개', en: 'Private' }, who: { ko: 'Chris, HR', en: 'Chris, HR' } } }],
        [{ t: '09:30~10:00', gray: true }, { t: '17:00~18:00', gray: true }],
        [],
      ],
    },
    {
      name: { ko: 'Jay', en: 'Jay' }, org: { ko: '(계정 비활성)', en: '(deactivated)' }, color: '#9aa0a8', gone: true,
      week: [[], [], [], [], [], [], []],
    },
  ],
};

// ── The OS ───────────────────────────────────────────────────────────

export class LaptopOS {
  constructor(om, gameState) {
    this.om = om;
    this.gameState = gameState;
    this.onReportSubmitted = null; // (beatId, picked) => {} — in-OS reports
    this.onSessionEvent = null;    // (eventName) => {} — ASI terminal sessions
    this.onSessionFlag = null;     // (flag) => {}
    this.onSessionEnd = null;      // (beatId) => {}
    this._session = null;          // { timers: [], popup } — active ASI session
    this._launching = false;
    this._pendingBeat = null;
    this._clockTimer = null;
    this._termLines = null;        // persists across app switches in one open

    this.el = document.createElement('div');
    this.el.id = 'laptop-os';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
  }

  open({ beat = null, onClose = null } = {}) {
    this._pendingBeat = beat;
    this._launching = false;
    this._termLines = [];
    this._buildShell();
    this.om.open(this.el, State.TERMINAL, {
      onClose: () => {
        if (this._clockTimer) { clearInterval(this._clockTimer); this._clockTimer = null; }
        this._cancelSession();
        if (!this._launching && onClose) onClose();
      },
    });
    this._openApp(null);
  }

  close() {
    if (this.om.current && this.om.current.el === this.el) this.om.close();
  }

  _launch(beatId) {
    this._launching = true;
    if (this.onLaunchBeat) this.onLaunchBeat(beatId);
  }

  // ── shell ──
  _buildShell() {
    const lang = L();
    this.el.innerHTML = '';

    const bar = document.createElement('div');
    bar.className = 'os-menubar';
    bar.innerHTML = `<span class="os-logo"></span><span class="os-appname" id="os-appname">Finder</span>
      <span class="os-menu-item">${lang === 'ko' ? '파일' : 'File'}</span><span class="os-menu-item">${lang === 'ko' ? '편집' : 'Edit'}</span><span class="os-menu-item">${lang === 'ko' ? '보기' : 'View'}</span>
      <span class="os-tray"><span class="os-wifi">⌇</span><span class="os-batt">▮▮▮▯</span><span id="os-clock"></span></span>`;
    this.el.appendChild(bar);

    this.viewEl = document.createElement('div');
    this.viewEl.className = 'os-view';
    this.el.appendChild(this.viewEl);

    const dock = document.createElement('div');
    dock.className = 'os-dock';
    for (const app of APPS) {
      const btn = document.createElement('button');
      btn.className = 'os-dock-app';
      btn.innerHTML = `<span class="os-dock-icon">${app.icon}</span><span class="os-dock-label">${t(app.name)}</span>`;
      if (this._pendingBeat && BEAT_APP[this._pendingBeat] === app.id) {
        const b = document.createElement('span');
        b.className = 'os-badge';
        b.textContent = '1';
        btn.appendChild(b);
      }
      btn.addEventListener('click', () => this._openApp(app.id));
      dock.appendChild(btn);
    }
    this.el.appendChild(dock);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'os-close';
    closeBtn.textContent = lang === 'ko' ? '⏻ 화면 닫기' : '⏻ Leave screen';
    closeBtn.addEventListener('click', () => this.close());
    this.el.appendChild(closeBtn);

    const tick = () => {
      const el = document.getElementById('os-clock');
      if (!el) return;
      const now = new Date();
      el.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    };
    tick();
    this._clockTimer = setInterval(tick, 15000);
  }

  _setAppName(name) {
    const el = document.getElementById('os-appname');
    if (el) el.textContent = name || 'Finder';
  }

  _openApp(id) {
    const lang = L();
    this.viewEl.innerHTML = '';
    this.viewEl.className = 'os-view';

    if (!id) {
      // desktop
      this._setAppName('');
      const d = document.createElement('div');
      d.className = 'os-desktop';
      d.innerHTML = `<div class="os-wallhint">${lang === 'ko' ? '하단 Dock에서 앱을 여세요' : 'Open an app from the Dock'}</div>`;
      if (this._pendingBeat) {
        const n = document.createElement('div');
        n.className = 'os-noti';
        const app = APPS.find(a => a.id === BEAT_APP[this._pendingBeat]);
        const msg = {
          report1: { ko: '주간 리포트 마감이 오늘입니다.', en: 'The weekly report is due today.' },
          report2: { ko: '이상 징후 보고서가 미제출 상태입니다.', en: 'The anomaly report has not been filed.' },
          contact1: { ko: '리포트 시스템에 저장하지 않은 초안이 있습니다.', en: 'The report system has an unsaved draft.' },
          nego: { ko: '터미널에 알 수 없는 세션 1개가 대기 중입니다.', en: 'The terminal has 1 unknown session waiting.' },
        }[this._pendingBeat];
        n.innerHTML = `<b>${t(app.name)}</b> — ${t(msg)}`;
        n.addEventListener('click', () => this._openApp(app.id));
        d.appendChild(n);
      }
      this.viewEl.appendChild(d);
      return;
    }

    const app = APPS.find(a => a.id === id);
    this._setAppName(t(app.name));

    // ASI beats: the host app renders normally, then a terminal window
    // pops open on its own and starts talking (handled in the app methods
    // + the scheduled session below).
    if (this._pendingBeat && BEAT_APP[this._pendingBeat] === id && OVERLAY_BEATS.has(this._pendingBeat)) {
      const beat = this._pendingBeat;
      const delay = beat === 'contact1' ? 1800 : 900;
      setTimeout(() => {
        if (this.om.current && this.om.current.el === this.el && this._pendingBeat === beat) {
          this._startAsiSession(beat);
        }
      }, delay);
      // fall through: render the app underneath
    }

    const frame = document.createElement('div');
    frame.className = 'os-frame';
    const titlebar = document.createElement('div');
    titlebar.className = 'os-titlebar';
    titlebar.innerHTML = `<span class="os-lights"><i class="r"></i><i class="y"></i><i class="g"></i></span><span class="os-title">${t(app.name)}</span>`;
    titlebar.querySelector('.r').addEventListener('click', () => this._openApp(null));
    frame.appendChild(titlebar);
    const win = document.createElement('div');
    win.className = `os-window os-app-${id}`;
    frame.appendChild(win);
    this.viewEl.appendChild(frame);
    this['_app_' + id](win);
  }

  // ── apps ──

  // ── ASI terminal session: a Terminal window that opens by itself ──
  _cancelSession() {
    if (!this._session) return;
    for (const tmr of this._session.timers) { clearTimeout(tmr); clearInterval(tmr); }
    if (this._session.popup) this._session.popup.remove();
    this._session = null;
  }

  _startAsiSession(beat) {
    const lang = L();
    this._cancelSession();
    const startId = beat === 'contact1' ? 'contact1_1' : 'nego_1';
    const title = beat === 'contact1' ? 'revan-sec-tunnel — 80×24' : 'revan-term — NO LOG — 80×24';

    const popup = document.createElement('div');
    popup.className = 'os-term-popup';
    popup.innerHTML = `<div class="os-term-pop-title"><span class="os-lights"><i class="r"></i><i class="y"></i><i class="g"></i></span><span>${title}</span></div>
      <div class="os-term-pop-body"></div><div class="os-term-pop-choices"></div>`;
    this.el.appendChild(popup);
    const body = popup.querySelector('.os-term-pop-body');
    const choicesEl = popup.querySelector('.os-term-pop-choices');

    const session = { timers: [], popup, skip: false };
    this._session = session;
    body.addEventListener('click', () => { session.skip = true; });

    const later = (fn, ms) => { const id = setTimeout(fn, ms); session.timers.push(id); return id; };
    const scroll = () => { body.scrollTop = body.scrollHeight; };

    const finish = () => {
      later(() => {
        this._cancelSession();
        if (this.onSessionEnd) this.onSessionEnd(beat);
      }, 2400);
    };

    const showNode = (id) => {
      const node = TERMINAL_SCRIPT[id];
      if (!node) { finish(); return; }
      if (node.event && this.onSessionEvent) this.onSessionEvent(node.event);
      choicesEl.innerHTML = '';
      const text = node.text[lang] !== undefined ? (node.text[lang] || '') : node.text.ko;
      if (text === '') { afterNode(node); return; }

      const line = document.createElement('div');
      line.className = 'os-term-pop-line' + (node.speaker === 'sys' ? ' sys' : '');
      body.appendChild(line);

      if (node.speaker === 'sys') {
        line.textContent = text;
        scroll();
        later(() => afterNode(node), node.pause || 1300);
        return;
      }
      let i = 0;
      session.skip = false;
      const tmr = setInterval(() => {
        if (session.skip) i = text.length;
        i++;
        line.textContent = text.substring(0, i);
        scroll();
        if (i >= text.length) {
          clearInterval(tmr);
          later(() => afterNode(node), node.pause || 1000);
        }
      }, 22);
      session.timers.push(tmr);
    };

    const afterNode = (node) => {
      if (node.choices && node.choices.length) {
        for (const choice of node.choices) {
          const btn = document.createElement('button');
          btn.textContent = choice.text[lang] || choice.text.ko;
          btn.addEventListener('click', () => {
            choicesEl.innerHTML = '';
            const echo = document.createElement('div');
            echo.className = 'os-term-pop-line me';
            echo.textContent = '> ' + (choice.text[lang] || choice.text.ko);
            body.appendChild(echo);
            scroll();
            if (choice.flag && this.onSessionFlag) this.onSessionFlag(choice.flag);
            later(() => showNode(choice.next), 350);
          });
          choicesEl.appendChild(btn);
        }
        return;
      }
      if (node.end) { finish(); return; }
      if (node.next) { showNode(node.next); return; }
      finish();
    };

    showNode(startId);
  }

  _app_terminal(win) {
    const lang = L();
    win.classList.add('os-dark');
    const out = document.createElement('div');
    out.className = 'os-term-out';
    win.appendChild(out);

    const print = (text, cls = '') => {
      if (text === null) return;
      const div = document.createElement('div');
      div.className = 'os-term-line ' + cls;
      div.textContent = text;
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
    };
    const run = (cmd) => {
      print('liam@Liams-MacBook ~ % ' + cmd, 'os-term-cmd');
      if (cmd.trim() === 'clear') { out.innerHTML = ''; return; }
      print(termOutput(cmd, this.gameState));
    };

    if (this._termLines.length === 0) {
      print('Last login: Thu 09:12 on ttys001');
      print(lang === 'ko' ? '(사내 클러스터 VPN 연결됨 — 도움말: help)' : '(lab cluster VPN connected — type: help)');
    }

    const chips = document.createElement('div');
    chips.className = 'os-term-chips';
    for (const c of TERM_SUGGESTIONS) {
      const b = document.createElement('button');
      b.textContent = c;
      b.addEventListener('click', () => run(c));
      chips.appendChild(b);
    }
    win.appendChild(chips);

    const form = document.createElement('form');
    form.className = 'os-term-inputrow';
    form.innerHTML = `<span class="os-term-ps1">liam@Liams-MacBook ~ %</span>`;
    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    form.appendChild(input);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      run(input.value);
      input.value = '';
    });
    win.appendChild(form);
    setTimeout(() => input.focus(), 50);
  }

  _app_browser(win) {
    const lang = L();
    win.classList.add('os-light');

    const page = document.createElement('div');
    page.className = 'os-portal';
    win.appendChild(page);

    const SERVICES = lang === 'ko'
      ? [['✉', '메일', '#03c75a'], ['☕', '카페', '#8a6f4d'], ['ⓑ', '블로그', '#2db400'], ['🛒', '쇼핑', '#f0568a'], ['₩', '페이', '#00c73c'], ['◔', '증권', '#e03131'], ['⌂', '부동산', '#4c8df6'], ['◎', '지도', '#12b886'], ['▶', '티비', '#ff5b3a']]
      : [['✉', 'Mail', '#03c75a'], ['☕', 'Cafe', '#8a6f4d'], ['ⓑ', 'Blog', '#2db400'], ['🛒', 'Shop', '#f0568a'], ['₩', 'Pay', '#00c73c'], ['◔', 'Stocks', '#e03131'], ['⌂', 'Realty', '#4c8df6'], ['◎', 'Maps', '#12b886'], ['▶', 'TV', '#ff5b3a']];

    const render = (state) => {
      page.innerHTML = '';
      const url = document.createElement('div');
      url.className = 'os-urlbar';
      url.innerHTML = `<span class="os-urlbtn">‹</span><span class="os-urlbtn">›</span><span class="os-urlbtn">⟳</span>
        <span class="os-url">🔒 revan.com${state.q ? '/search?q=' + encodeURIComponent(state.q) : state.article ? '/news/' + state.article.id : ''}</span>
        <span class="os-urlbtn">⇪</span><span class="os-urlbtn">＋</span>`;
      page.appendChild(url);

      const body = document.createElement('div');
      body.className = 'os-portal-scroll';
      page.appendChild(body);

      const header = document.createElement('div');
      header.className = 'os-portal-head' + (state.q || state.article ? ' compact' : '');
      const logo = document.createElement('button');
      logo.className = 'os-portal-logo';
      logo.textContent = 'REVAN';
      logo.addEventListener('click', () => render({}));
      header.appendChild(logo);
      const form = document.createElement('form');
      form.className = 'os-portal-search';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = lang === 'ko' ? '검색어를 입력해 주세요' : 'Search';
      if (state.q) input.value = state.q;
      const sbtn = document.createElement('button');
      sbtn.type = 'submit';
      sbtn.innerHTML = '⌕';
      form.appendChild(input); form.appendChild(sbtn);
      form.addEventListener('submit', (e) => { e.preventDefault(); if (input.value.trim()) render({ q: input.value }); });
      header.appendChild(form);
      body.appendChild(header);

      // ── article page ──
      if (state.article) {
        const a = state.article;
        const art = document.createElement('div');
        art.className = 'os-article';
        art.innerHTML = `<div class="os-article-press"><b>${t(a.press)}</b><button class="os-subs">${lang === 'ko' ? '+ 구독' : '+ Follow'}</button></div>
          <h1>${t(a.title)}</h1>
          <div class="os-article-meta"><span>${t(a.reporter) || ''}</span><span>·</span><span>${lang === 'ko' ? '입력 ' : ''}${t(a.date)}</span>
            <span class="os-article-meta-r">${lang === 'ko' ? '가' : 'Aa'} <b>+</b> <b>−</b></span></div>
          <figure class="os-article-hero">${thumbHTML(a.thumb)}<figcaption>${t(a.title)} · ${t(a.press)}</figcaption></figure>`;
        for (const par of a.paras) {
          const pEl = document.createElement('p');
          pEl.textContent = t(par);
          art.appendChild(pEl);
        }
        const sig = document.createElement('div');
        sig.className = 'os-article-sig';
        sig.textContent = (t(a.reporter) || '') + (lang === 'ko' ? ' (press@' + a.id + '.news)' : '');
        art.appendChild(sig);

        const reacts = document.createElement('div');
        reacts.className = 'os-article-reacts';
        const R_ = lang === 'ko'
          ? [['🙂', '쏠쏠정보', 214], ['😲', '흥미진진', 178], ['❤', '공감백배', 96], ['🧐', '분석탁월', 61], ['➡', '후속강추', 33]]
          : [['🙂', 'useful', 214], ['😲', 'wow', 178], ['❤', 'agree', 96], ['🧐', 'sharp', 61], ['➡', 'more', 33]];
        reacts.innerHTML = R_.map(r => `<button><i>${r[0]}</i><b>${r[1]}</b><span>${r[2]}</span></button>`).join('');
        art.appendChild(reacts);

        if (a.comments && a.comments.length) {
          const cw = document.createElement('div');
          cw.className = 'os-comments';
          cw.innerHTML = `<div class="os-comments-head"><b>${lang === 'ko' ? '댓글' : 'Comments'}</b><span>${a.comments.length}</span>
            <em>${lang === 'ko' ? '순공감순' : 'Top'}</em><em class="dim">${lang === 'ko' ? '최신순' : 'Newest'}</em></div>`;
          for (const c of a.comments) {
            const d = document.createElement('div');
            d.className = 'os-comment';
            d.innerHTML = `<span class="os-comment-av">${c.who.slice(0, 1)}</span>
              <div><b>${c.who}</b><p>${t(c.text)}</p>
              <div class="os-comment-foot"><span>👍 ${c.up}</span><span>👎</span><span>${lang === 'ko' ? '답글' : 'Reply'}</span></div></div>`;
            cw.appendChild(d);
          }
          art.appendChild(cw);
        }
        if (a.related && a.related.length) {
          const rel = document.createElement('div');
          rel.className = 'os-article-rel';
          rel.innerHTML = `<h5>${lang === 'ko' ? `${t(a.press)} 주요뉴스` : 'Related'}</h5>`;
          for (const rid of a.related) {
            const rn = NEWS.find(n => n.id === rid);
            if (!rn) continue;
            const rb = document.createElement('button');
            rb.className = 'os-rel-row';
            rb.innerHTML = `<span class="os-rel-thumb">${thumbHTML(rn.thumb)}</span><span>${t(rn.title)}</span>`;
            rb.addEventListener('click', () => { render({ article: rn }); page.querySelector('.os-portal-scroll').scrollTop = 0; });
            rel.appendChild(rb);
          }
          art.appendChild(rel);
        }
        body.appendChild(art);
        return;
      }

      // ── search results page ──
      if (state.q) {
        const tabs = document.createElement('div');
        tabs.className = 'os-search-tabs';
        const tn = lang === 'ko' ? ['통합', '뉴스', '이미지', '블로그', '카페', '쇼핑', '지식iN'] : ['All', 'News', 'Images', 'Blogs', 'Cafe', 'Shop', 'Q&A'];
        tabs.innerHTML = tn.map((n, i) => `<span class="${i === 0 ? 'on' : ''}">${n}</span>`).join('');
        body.appendChild(tabs);

        const results = searchResults(state.q);
        const wrap = document.createElement('div');
        wrap.className = 'os-results';
        if (!results || results.length === 0) {
          wrap.innerHTML = `<div class="os-noresult"><b>'${state.q}'</b>${lang === 'ko' ? '에 대한 검색결과가 없습니다.' : ': no results found.'}<br>
            <span>${lang === 'ko' ? '단어의 철자가 정확한지 확인해 보세요.' : 'Check the spelling and try again.'}</span></div>`;
        } else {
          const sh = document.createElement('div');
          sh.className = 'os-results-head';
          sh.innerHTML = lang === 'ko' ? '웹문서 · 뉴스' : 'Web · News';
          wrap.appendChild(sh);
          for (const r of results) {
            const d = document.createElement('div');
            d.className = 'os-result';
            d.innerHTML = `<div class="os-result-src"><span class="os-result-fav">${r.source.slice(0, 1)}</span>${r.source}<em>· ${r.time}</em></div>
              <div class="os-result-title">${r.title}</div><div class="os-result-snippet">${r.snippet}</div>`;
            wrap.appendChild(d);
          }
          const relq = document.createElement('div');
          relq.className = 'os-relq';
          const terms = TRENDING.filter(tr => t(tr) !== state.q).slice(0, 5);
          relq.innerHTML = `<b>${lang === 'ko' ? '연관 검색어' : 'Related searches'}</b>` +
            terms.map(tr => `<button data-q="${t(tr)}">${t(tr)}</button>`).join('');
          relq.querySelectorAll('button').forEach(b => b.addEventListener('click', () => render({ q: b.dataset.q })));
          wrap.appendChild(relq);
        }
        body.appendChild(wrap);
        return;
      }

      // ── portal home ──
      const strip = document.createElement('div');
      strip.className = 'os-services';
      strip.innerHTML = SERVICES.map(sv => `<span class="os-service"><i style="background:${sv[2]}">${sv[0]}</i>${sv[1]}</span>`).join('');
      body.appendChild(strip);

      const cols = document.createElement('div');
      cols.className = 'os-portal-cols';

      // news column
      const news = document.createElement('div');
      news.className = 'os-newsstand';
      news.innerHTML = `<div class="os-box-head"><b>${lang === 'ko' ? '뉴스스탠드' : 'Newsstand'}</b><span>${lang === 'ko' ? '언론사 편집' : 'Editors\u2019 picks'}</span></div>`;
      const top = NEWS[0];
      const card = document.createElement('button');
      card.className = 'os-news-card';
      card.innerHTML = `<div class="os-news-thumb">${thumbHTML(top.thumb)}</div>
        <div class="os-news-card-body"><b>${t(top.title)}</b><span>${t(top.paras[0]).slice(0, lang === 'ko' ? 64 : 100)}…</span>
        <em>${t(top.press)} · ${t(top.date)}</em></div>`;
      card.addEventListener('click', () => render({ article: top }));
      news.appendChild(card);
      for (const n of NEWS.slice(1)) {
        const row = document.createElement('button');
        row.className = 'os-news-item';
        row.innerHTML = `<div class="os-news-thumb sm">${thumbHTML(n.thumb)}</div>
          <div><span class="os-news-item-title">${t(n.title)}</span><em>${t(n.press)} · ${t(n.date)}</em></div>`;
        row.addEventListener('click', () => render({ article: n }));
        news.appendChild(row);
      }
      cols.appendChild(news);

      // right column: login + trending + market/weather
      const side = document.createElement('div');
      side.className = 'os-portal-side';
      side.innerHTML = `
        <div class="os-login">
          <p>${lang === 'ko' ? '레반을 더 안전하고<br>편리하게 이용하세요' : 'Use Revan more safely<br>and conveniently'}</p>
          <button class="os-login-btn">${lang === 'ko' ? 'REVAN 로그인' : 'Sign in to REVAN'}</button>
          <div class="os-login-links"><span>${lang === 'ko' ? '아이디 찾기' : 'Find ID'}</span><i>|</i><span>${lang === 'ko' ? '비밀번호 찾기' : 'Password'}</span><i>|</i><span>${lang === 'ko' ? '회원가입' : 'Sign up'}</span></div>
        </div>`;

      const trend = document.createElement('div');
      trend.className = 'os-trend';
      trend.innerHTML = `<div class="os-box-head"><b>${lang === 'ko' ? '급상승 검색어' : 'Trending'}</b><span>${lang === 'ko' ? '15:00 기준' : 'as of 15:00'}</span></div>`;
      TRENDING.forEach((tr, i) => {
        const row = document.createElement('button');
        row.className = 'os-trend-row';
        const dir = [1, 2, 5].includes(i + 1) ? '<i class="up">▲</i>' : (i + 1 === 6 ? '<i class="dn">▼</i>' : '<i class="sm">—</i>');
        row.innerHTML = `<b>${i + 1}</b><span>${t(tr)}</span>${dir}`;
        row.addEventListener('click', () => render({ q: t(tr) }));
        trend.appendChild(row);
      });
      side.appendChild(trend);

      const wm = document.createElement('div');
      wm.className = 'os-widget-stack';
      wm.innerHTML = `
        <div class="os-widget">
          <svg viewBox="0 0 40 40" width="30" height="30"><circle cx="15" cy="15" r="8" fill="#f7c948"/>
            <ellipse cx="24" cy="24" rx="12" ry="8" fill="#cfd6e2"/><ellipse cx="14" cy="26" rx="9" ry="6" fill="#e3e8f0"/></svg>
          <div><b>23°</b><span>${lang === 'ko' ? '서울 · 구름 조금' : 'Seoul · partly cloudy'}</span></div>
        </div>
        <div class="os-widget os-widget-market">
          ${MARKET.map(mk => `<div class="os-mkrow"><span>${t(mk.name)}</span><b>${mk.value}</b><em class="${mk.up ? 'up' : 'dn'}">${mk.delta}</em></div>`).join('')}
        </div>`;
      side.appendChild(wm);
      cols.appendChild(side);
      body.appendChild(cols);

      const foot = document.createElement('div');
      foot.className = 'os-portal-foot';
      foot.textContent = lang === 'ko' ? '이용약관 · 개인정보처리방침 · 청소년보호정책 · ⓒ REVAN Corp.' : 'Terms · Privacy · Youth policy · © REVAN Corp.';
      body.appendChild(foot);
    };

    render({});
  }

  _app_slack(win) {
    const lang = L();
    win.classList.add('os-slack');

    // top search bar (Slack desktop chrome)
    const top = document.createElement('div');
    top.className = 'sl-topbar';
    top.innerHTML = `<span class="sl-nav-arrows">‹ › 🕐</span><span class="sl-searchbar">⌕ ${lang === 'ko' ? 'Raven Corp 검색' : 'Search Raven Corp'}</span><span class="sl-help">?</span>`;
    win.appendChild(top);

    const cols = document.createElement('div');
    cols.className = 'sl-cols';
    win.appendChild(cols);

    // workspace rail
    const rail = document.createElement('div');
    rail.className = 'sl-rail';
    const railItems = lang === 'ko'
      ? [['🏠', '홈', true], ['💬', 'DM', false], ['🔔', '내 활동', false], ['📁', '파일', false], ['⋯', '더 보기', false]]
      : [['🏠', 'Home', true], ['💬', 'DMs', false], ['🔔', 'Activity', false], ['📁', 'Files', false], ['⋯', 'More', false]];
    rail.innerHTML = `<div class="sl-ws-icon">R</div>` +
      railItems.map(r => `<div class="sl-rail-item ${r[2] ? 'on' : ''}"><i>${r[0]}</i><span>${r[1]}</span></div>`).join('') +
      `<div class="sl-rail-spacer"></div><div class="sl-rail-plus">＋</div><div class="sl-rail-me">L<i></i></div>`;
    cols.appendChild(rail);

    // sidebar
    const side = document.createElement('div');
    side.className = 'sl-side';
    side.innerHTML = `<div class="sl-ws-head"><b>Raven Corp</b> <span class="sl-caret">▾</span><span class="sl-compose">✐</span></div>
      <div class="sl-find">⌕ ${lang === 'ko' ? '대화 찾기...' : 'Find a conversation...'}</div>
      <div class="sl-nav">
        <div class="sl-nav-item">🧵 ${lang === 'ko' ? '스레드' : 'Threads'} <em class="sl-badge">2</em></div>
        <div class="sl-nav-item">🎧 ${lang === 'ko' ? '허들' : 'Huddles'}</div>
        <div class="sl-nav-item">📤 ${lang === 'ko' ? '보내기 예약' : 'Drafts & sent'} <em class="sl-dim">✎ 3</em></div>
        <div class="sl-nav-item">🗂 ${lang === 'ko' ? '디렉터리' : 'Directories'}</div>
      </div>`;
    cols.appendChild(side);

    // main
    const main = document.createElement('div');
    main.className = 'sl-main';
    cols.appendChild(main);

    const openCh = (id) => {
      const ch = SLACK_CHANNELS[id];
      side.querySelectorAll('.sl-ch').forEach(b => b.classList.toggle('on', b.dataset.id === id));
      main.innerHTML = '';
      const label = typeof ch.label === 'string' ? ch.label : t(ch.label);
      const disp = ch.dm ? label : (ch.lock ? '🔒 ' + label : label);

      const head = document.createElement('div');
      head.className = 'sl-head';
      const avStack = ch.dm
        ? ''
        : `<span class="sl-avstack">${(ch.msgs.slice(0, 3).map(mm => `<i style="background:${mm.color}">${mm.who.slice(0, 1)}</i>`)).join('')}<em>${ch.members || 3}</em></span>`;
      head.innerHTML = `<div class="sl-head-l"><span class="sl-star">☆</span><b>${disp} ▾</b></div>
        <div class="sl-head-r">${avStack}<span class="sl-huddle">🎧 ▾</span><span>🔔</span><span>⌕</span><span>⋮</span></div>`;
      main.appendChild(head);

      const tabs = document.createElement('div');
      tabs.className = 'sl-tabs';
      const tabNames = lang === 'ko'
        ? ['메시지', '파일 및 링크', '핀', '북마크', '워크플로', '더 보기']
        : ['Messages', 'Files & links', 'Pins', 'Bookmarks', 'Workflows', 'More'];
      tabs.innerHTML = tabNames.map((n, i) => `<span class="${i === 0 ? 'on' : ''}">${n}</span>`).join('') + '<span class="sl-tab-plus">＋</span>';
      main.appendChild(tabs);

      const list = document.createElement('div');
      list.className = 'sl-msgs';
      let lastWhen = null;
      for (const msg of ch.msgs) {
        if (msg.newDivider) {
          const nd = document.createElement('div');
          nd.className = 'sl-newmsgs';
          nd.innerHTML = `<span>↓ ${lang === 'ko' ? '새 메시지' : 'New messages'}</span>`;
          list.appendChild(nd);
          lastWhen = null;
        }
        const when = t(msg.when);
        if (when !== lastWhen) {
          lastWhen = when;
          const div = document.createElement('div');
          div.className = 'sl-divider';
          div.innerHTML = `<span>${when} ▾</span>`;
          list.appendChild(div);
        }
        const row = document.createElement('div');
        row.className = 'sl-msg';
        const time = `${lang === 'ko' ? '오후' : ''} ${(Math.abs(msg.who.length * 7 + msg.text.ko.length) % 12) + 1}:${String((msg.text.ko.length * 3) % 60).padStart(2, '0')}`;
        const text = t(msg.text).replace(/@(Liam|Mina|Chris|Jay)/g, '<i class="sl-mention">@$1</i>');
        row.innerHTML = `<span class="sl-avatar" style="background:${msg.color}">${msg.who.slice(0, 1)}</span>
          <div class="sl-body"><div class="sl-byline"><b>${msg.who}${ch.dm || msg.bot ? '' : ' (Raven)'}</b>${msg.bot ? '<i class="sl-bot">APP</i>' : ''}<em>${time}</em></div>
          <div class="sl-text">${text}</div>
          ${msg.link ? `<div class="sl-linkcard"><div class="sl-linkbar"></div><div class="sl-linkbody">
            <b>${t(msg.link.title)}</b><span>${t(msg.link.desc)}</span>
            <div class="sl-linkimg"><img src="assets/web/news-${msg.link.img}.jpg" alt="" loading="lazy" onerror="this.remove()"></div>
          </div></div>` : ''}
          ${msg.reacts && msg.reacts.length ? `<div class="sl-reacts">${msg.reacts.map(r => `<button>${r[0]} <b>${r[1]}</b></button>`).join('')}<button class="sl-react-add">☺＋</button></div>` : ''}
          ${msg.thread ? `<button class="sl-thread"><span class="sl-thread-avs">${msg.thread.avatars.map(a => `<i style="background:${a[1]}">${a[0]}</i>`).join('')}</span>
            <b>${lang === 'ko' ? `${msg.thread.count}개의 답글` : `${msg.thread.count} replies`}</b><em>${lang === 'ko' ? '마지막 답글: ' : 'Last reply '}${t(msg.thread.last)}</em></button>` : ''}
          </div>`;
        list.appendChild(row);
      }
      main.appendChild(list);

      const latest = document.createElement('div');
      latest.className = 'sl-latest';
      latest.innerHTML = `<span>↓ ${lang === 'ko' ? '최신 메시지' : 'Latest messages'}</span>`;
      list.appendChild(latest);

      const composer = document.createElement('div');
      composer.className = 'sl-composer';
      composer.innerHTML = `<div class="sl-tools">𝐁 𝐼 <u>U</u> <s>S</s> <span>⛓</span> <span>≡</span> <span>≣</span> <span>❝</span> <span>‹›</span> <span>⧉</span></div>
        <div class="sl-input">${lang === 'ko' ? `${disp}에 메시지 보내기` : `Message ${disp}`}<span class="sl-net">${lang === 'ko' ? ' — 외부망 점검으로 전송 비활성화' : ' — sending disabled (network maintenance)'}</span></div>
        <div class="sl-actions"><span class="sl-plus">＋</span><span>Aa</span><span>☺</span><span>@</span><span>🎞</span><span>🎙</span><span class="sl-send">➤</span></div>`;
      main.appendChild(composer);
      list.scrollTop = list.scrollHeight;
    };

    for (const sec of SLACK_SECTIONS) {
      const h = document.createElement('div');
      h.className = 'sl-section';
      h.innerHTML = `<i>▾</i> ${t(sec.label)}`;
      side.appendChild(h);
      for (const id of sec.ids) {
        const ch = SLACK_CHANNELS[id];
        const b = document.createElement('button');
        b.className = 'sl-ch';
        b.dataset.id = id;
        const label = typeof ch.label === 'string' ? ch.label : t(ch.label);
        if (ch.dm) {
          const color = (ch.msgs.find(msg => msg.who !== 'Liam') || ch.msgs[0]).color;
          b.innerHTML = `<span class="sl-dm-av" style="background:${color}">${label.slice(0, 1)}<i class="${ch.online ? 'on' : ''}"></i></span>${label}`;
        } else {
          b.innerHTML = `<span class="sl-hash">${ch.lock ? '🔒' : '#'}</span>${label.replace('#', '')}${id === 'ai-lab' ? '<em class="sl-badge">1</em>' : ''}`;
        }
        b.addEventListener('click', () => openCh(id));
        side.appendChild(b);
      }
      if (sec.ids.includes('general')) {
        const add = document.createElement('div');
        add.className = 'sl-add';
        add.innerHTML = `<span>＋</span> ${lang === 'ko' ? '채널 추가' : 'Add channels'}`;
        side.appendChild(add);
      }
    }
    const more = document.createElement('div');
    more.className = 'sl-moreunread';
    more.textContent = lang === 'ko' ? '⌄ 더 많은 안 읽은 항목' : '⌄ More unreads';
    side.appendChild(more);

    openCh('ai-lab');
  }

  _app_report(win) {
    const lang = L();
    win.classList.add('os-light');

    const beat = (this._pendingBeat === 'report1' || this._pendingBeat === 'report2') ? this._pendingBeat : null;
    if (!beat) {
      if (this._pendingBeat === 'contact1') {
        // the draft Liam can't finish — the terminal will interrupt shortly
        win.innerHTML = `<div class="os-report">
          <div class="os-report-head"><b>${lang === 'ko' ? '이상 징후 보고서 (임시 저장)' : 'Anomaly report (draft)'}</b>
          <span>${lang === 'ko' ? 'REVAN 리포트 시스템 v4.2 · 수신: Chris (리더)' : 'REVAN Report System v4.2 · To: Chris (Lead)'}</span></div>
          <div class="os-report-slot"><div class="os-report-label">${lang === 'ko' ? '관찰 요약' : 'Observation summary'}</div>
            <div class="os-draft-line">${lang === 'ko' ? '피험체 #7491, 컴퓨트 사용량 정상 범위… 아님. 정상 범위였으면 좋겠' : 'Subject #7491 compute usage within normal ran— no. within normal range would be nice'}<span class="os-draft-caret"></span></div>
          </div>
          <div class="os-draft-hint">${lang === 'ko' ? '(2일째 이 문장에서 멈춰 있다)' : '(Stuck on this sentence for two days now)'}</div>
        </div>`;
        return;
      }
      win.innerHTML = `<div class="os-empty">
        <div class="os-empty-icon">▤</div>
        <div>${lang === 'ko' ? '제출할 리포트가 없습니다.' : 'No reports due.'}</div>
        <div class="os-empty-sub">${lang === 'ko' ? '다음 마감: 금요일 (주간 학습 리포트)' : 'Next due: Friday (weekly training report)'}</div>
      </div>`;
      return;
    }

    const report = REPORTS[beat];
    const selections = {};
    const form = document.createElement('div');
    form.className = 'os-report';
    const head = document.createElement('div');
    head.className = 'os-report-head';
    head.innerHTML = `<b>${beat === 'report1'
      ? (lang === 'ko' ? '주간 학습 리포트' : 'Weekly training report')
      : (lang === 'ko' ? '이상 징후 보고서' : 'Anomaly report')}</b>
      <span>${lang === 'ko' ? 'REVAN 리포트 시스템 v4.2 · 수신: Chris (리더)' : 'REVAN Report System v4.2 · To: Chris (Lead)'}</span>`;
    form.appendChild(head);

    const submit = document.createElement('button');
    submit.className = 'os-report-submit';
    submit.textContent = lang === 'ko' ? '보고서 전송' : 'Send report';
    submit.disabled = true;

    for (const slot of report.slots) {
      const wrap = document.createElement('div');
      wrap.className = 'os-report-slot';
      const label = document.createElement('div');
      label.className = 'os-report-label';
      label.textContent = slot.label[lang] || slot.label.ko;
      wrap.appendChild(label);
      for (const option of slot.options) {
        const btn = document.createElement('button');
        btn.className = 'os-report-option';
        btn.textContent = option.text[lang] || option.text.ko;
        btn.addEventListener('click', () => {
          selections[slot.id] = option;
          wrap.querySelectorAll('.os-report-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          submit.disabled = !report.slots.every(sl => selections[sl.id]);
        });
        wrap.appendChild(btn);
      }
      form.appendChild(wrap);
    }

    submit.addEventListener('click', () => {
      const picked = Object.values(selections);
      for (const option of picked) {
        if (option.honesty) this.gameState.honesty.push(option.honesty);
        if (option.suspicionDelta) this.gameState.suspicion += option.suspicionDelta;
      }
      form.classList.add('os-report-sent');
      submit.disabled = true;
      submit.textContent = lang === 'ko' ? '전송됨 ✓' : 'Sent ✓';
      this._pendingBeat = null;
      setTimeout(() => {
        this.close();
        if (this.onReportSubmitted) this.onReportSubmitted(beat, picked);
      }, 900);
    });
    form.appendChild(submit);
    win.appendChild(form);
  }

  _app_mail(win) {
    const lang = L();
    win.classList.add('os-light', 'cn-app');

    const bar = document.createElement('div');
    bar.className = 'cn-bar';
    bar.innerHTML = `<span class="cn-logo"><b>Revan</b> <em>${lang === 'ko' ? '메일' : 'Mail'}</em></span>
      <span class="cn-search">⌕ ${lang === 'ko' ? '메일 검색' : 'Search mail'}</span>
      <span class="cn-tray"><i>🏠</i><i>💬</i><i class="on">✉</i><i>📅</i><i>🗂</i><i>⚙</i></span>`;
    win.appendChild(bar);

    const body = document.createElement('div');
    body.className = 'cn-body';
    win.appendChild(body);

    const side = document.createElement('div');
    side.className = 'cn-side';
    const unread = MAILS.filter(mm => mm.unread).length;
    side.innerHTML = `
      <div class="cn-write"><b>${lang === 'ko' ? '메일쓰기' : 'Compose'}</b><span>${lang === 'ko' ? '메모쓰기' : 'Memo'}</span></div>
      <div class="cn-counts">
        <span><b>${unread}</b>${lang === 'ko' ? '안읽음' : 'Unread'}</span>
        <span><b>★</b>${lang === 'ko' ? '중요' : 'Starred'}</span>
        <span><b>⏰</b>${lang === 'ko' ? '리마인드' : 'Remind'}</span>
        <span><b>TO</b>${lang === 'ko' ? '받는사람' : 'To me'}</span>
      </div>
      <div class="cn-folders">
        <div>✉ ${lang === 'ko' ? '전체메일' : 'All mail'} <em>999+</em></div>
        <div class="on">📥 ${lang === 'ko' ? '받은메일함' : 'Inbox'} <em>${MAILS.length}</em></div>
        <div>📤 ${lang === 'ko' ? '보낸메일함' : 'Sent'}</div>
        <div>👁 ${lang === 'ko' ? '수신확인' : 'Read receipts'}</div>
        <div>📁 ${lang === 'ko' ? '임시보관함' : 'Drafts'}</div>
        <div>🗑 ${lang === 'ko' ? '스팸메일함' : 'Spam'} <em>1</em></div>
      </div>
      <div class="cn-side-sec">${lang === 'ko' ? '즐겨찾는 연락처' : 'Favorites'}</div>
      <div class="cn-contacts"><div>ㄴ Mina <em>24</em></div><div>ㄴ Chris <em>3</em></div></div>
      <div class="cn-side-sec">${lang === 'ko' ? '내 메일함' : 'My folders'}</div>
      <div class="cn-contacts"><div>📁 c7491-alerts <em>474</em></div><div>📁 Weekly Report <em>92</em></div><div>📁 OTP <em>999+</em></div></div>
      <div class="cn-quota">${lang === 'ko' ? '용량 18.6GB / 3TB' : '18.6GB / 3TB used'}</div>`;
    body.appendChild(side);

    const main = document.createElement('div');
    main.className = 'cn-main';
    body.appendChild(main);

    const renderList = () => {
      main.innerHTML = '';
      const tools = document.createElement('div');
      tools.className = 'cn-tools';
      const tn = lang === 'ko'
        ? ['읽음', '삭제', '스팸신고', '답장', '전체답장', '전달', '이동 ▾', '리마인드 ▾', '⋯']
        : ['Read', 'Delete', 'Spam', 'Reply', 'Reply all', 'Forward', 'Move ▾', 'Remind ▾', '⋯'];
      tools.innerHTML = `<label class="cn-chk"><input type="checkbox"></label>` + tn.map(x => `<button>${x}</button>`).join('') +
        `<span class="cn-tools-r">≡ ▾ &nbsp; ⏱ ▾ &nbsp; ☰ ▾</span>`;
      main.appendChild(tools);

      const list = document.createElement('div');
      list.className = 'cn-list';
      MAILS.forEach((mm) => {
        const row = document.createElement('button');
        row.className = 'cn-row' + (mm.unread ? ' unread' : '') + (mm.read ? ' opened' : '');
        const from = typeof mm.from === 'string' ? mm.from : t(mm.from);
        row.innerHTML = `<label class="cn-chk" onclick="event.stopPropagation()"><input type="checkbox"></label>
          <span class="cn-star">☆</span>
          <span class="cn-env">${mm.unread && !mm.read ? '✉' : '📨'}</span>
          <span class="cn-from">${from}</span>
          ${mm.to ? '<span class="cn-to">TO</span>' : '<span class="cn-to none"></span>'}
          <span class="cn-subj">${mm.bang ? '<b class="cn-bang">!</b> ' : ''}${t(mm.subject)}</span>
          <span class="cn-time">${t(mm.time)}</span>`;
        row.addEventListener('click', () => { mm.read = true; mm.unread = false; renderRead(mm); });
        list.appendChild(row);
      });
      main.appendChild(list);

      const pager = document.createElement('div');
      pager.className = 'cn-pager';
      pager.innerHTML = `<b>1</b>` + [2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<span>${n}</span>`).join('') + `<span>›</span><span>»</span>`;
      main.appendChild(pager);
    };

    const renderRead = (mm) => {
      main.innerHTML = '';
      const from = typeof mm.from === 'string' ? mm.from : t(mm.from);
      const tools = document.createElement('div');
      tools.className = 'cn-tools';
      const back = document.createElement('button');
      back.textContent = lang === 'ko' ? '← 목록' : '← List';
      back.addEventListener('click', renderList);
      tools.appendChild(back);
      (lang === 'ko' ? ['답장', '전체답장', '전달', '삭제', '스팸신고', '이동 ▾'] : ['Reply', 'Reply all', 'Forward', 'Delete', 'Spam', 'Move ▾'])
        .forEach(x => { const b = document.createElement('button'); b.textContent = x; tools.appendChild(b); });
      main.appendChild(tools);

      const rd = document.createElement('div');
      rd.className = 'cn-read';
      rd.innerHTML = `<h3>${mm.bang ? '<b class="cn-bang">!</b> ' : ''}${t(mm.subject)}</h3>
        <div class="cn-read-meta"><span class="cn-read-av">${from.slice(0, 1)}</span>
          <div><b>${from}</b><span>${lang === 'ko' ? '받는사람' : 'To'}: liam@revancorp.com</span></div>
          <em>${t(mm.time)}</em></div>
        <div class="cn-read-body">${t(mm.body).replace(/\n/g, '<br>')}</div>`;
      main.appendChild(rd);
    };

    renderList();
  }

  _app_calendar(win) {
    const lang = L();
    win.classList.add('os-light', 'cn-app');

    const bar = document.createElement('div');
    bar.className = 'cn-bar';
    bar.innerHTML = `<span class="cn-logo"><b>Revan</b> <em>${lang === 'ko' ? '캘린더' : 'Calendar'}</em></span>
      <span class="cn-search">⌕ ${lang === 'ko' ? '구성원, 조직, 그룹 검색' : 'Search members, orgs'}</span>
      <span class="cn-tray"><i>🏠</i><i>💬</i><i>✉</i><i class="on">📅</i><i>🗂</i><i>⚙</i></span>`;
    win.appendChild(bar);

    const body = document.createElement('div');
    body.className = 'cn-body';
    win.appendChild(body);

    const side = document.createElement('div');
    side.className = 'cn-side cn-cal-side';
    const mini = (() => {
      const heads = (lang === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
        .map((w, i) => `<i class="${i === 0 ? 'red' : ''}">${w}</i>`).join('');
      const cells = [];
      let day = 26, month = 'prev';
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
          if (month === 'prev' && day > 31) { day = 1; month = 'cur'; }
          else if (month === 'cur' && day > 31) { day = 1; month = 'next'; }
          const cur = month === 'cur';
          const today = cur && day === 22;
          const inWeek = cur && day >= 16 && day <= 22;
          cells.push(`<i class="${cur ? '' : 'dim'} ${c === 0 ? 'red' : ''} ${today ? 'today' : ''} ${inWeek ? 'wk' : ''}">${day}</i>`);
          day++;
        }
      }
      return `<div class="cn-mini-head">2038. 08 <span>‹ ›</span></div><div class="cn-mini">${heads}${cells.join('')}</div>`;
    })();
    side.innerHTML = `<button class="cn-cal-write">${lang === 'ko' ? '일정쓰기' : 'New event'}</button>${mini}
      <div class="cn-side-sec cn-cal-org">👥 ${lang === 'ko' ? 'AI연구팀' : 'AI Research'}</div>
      <div class="cn-contacts"><div>${lang === 'ko' ? '다른 조직 일정보기' : 'Other orgs'}</div></div>
      <div class="cn-quota">© REVAN Corp.</div>`;
    body.appendChild(side);

    const main = document.createElement('div');
    main.className = 'cn-main cn-cal-main';
    body.appendChild(main);

    const head = document.createElement('div');
    head.className = 'cn-cal-head';
    head.innerHTML = `<button class="cn-cal-nav">${lang === 'ko' ? '오늘' : 'Today'}</button><span class="cn-cal-nav">‹ ›</span>
      <b>${CAL_WEEK.range}</b>
      <span class="cn-cal-tabs">${lang === 'ko' ? '개인' : 'Me'} <i>${lang === 'ko' ? '일간' : 'Day'}</i><i>${lang === 'ko' ? '주간' : 'Week'}</i><i>${lang === 'ko' ? '월간' : 'Month'}</i>
      &nbsp; ${lang === 'ko' ? '구성원' : 'Team'} <i>${lang === 'ko' ? '일간' : 'Day'}</i><i class="on">${lang === 'ko' ? '주간' : 'Week'}</i></span>`;
    main.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'cn-cal-grid';
    const hrow = document.createElement('div');
    hrow.className = 'cn-cal-row cn-cal-hrow';
    hrow.innerHTML = `<div class="cn-cal-member">${lang === 'ko' ? '구성원' : 'Member'}</div>` +
      CAL_WEEK.days.map(d => `<div class="cn-cal-dayhead ${d.red ? 'red' : ''} ${d.today ? 'today' : ''}">
        ${d.d} ${t(d.w)}${d.note ? `<em>${t(d.note)}</em>` : ''}</div>`).join('');
    grid.appendChild(hrow);

    let pop = null;
    const closePop = () => { if (pop) { pop.remove(); pop = null; } };

    for (const mem of CAL_WEEK.members) {
      const row = document.createElement('div');
      row.className = 'cn-cal-row' + (mem.gone ? ' gone' : '');
      const mc = document.createElement('div');
      mc.className = 'cn-cal-member';
      mc.innerHTML = `<span class="cn-cal-av" style="background:${mem.color}">${t(mem.name).slice(0, 1)}</span>
        <div><b>${t(mem.name)}</b><span>${t(mem.org)}</span>${mem.gone ? '' : `<a>${lang === 'ko' ? '월간 일정' : 'Monthly'}</a>`}</div>`;
      row.appendChild(mc);
      mem.week.forEach((evs, di) => {
        const cell = document.createElement('div');
        cell.className = 'cn-cal-cell' + (CAL_WEEK.days[di].today ? ' today' : '');
        for (const ev of evs) {
          const chip = document.createElement('button');
          chip.className = 'cn-ev' + (ev.gray ? ' gray' : '') + (ev.cancel ? ' cancel' : '') + (ev.all ? ' all' : '') + (mem.me && !ev.gray ? ' mine' : '');
          if (ev.gray) {
            chip.innerHTML = `<b>${ev.t}⟳</b>${lang === 'ko' ? '일정있음' : 'Busy'}`;
          } else {
            chip.innerHTML = `<b>${ev.all ? (lang === 'ko' ? '종일' : 'All day') : ev.t}${ev.lock ? ' 🔒' : ''}</b>${t(ev.title)}`;
          }
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            closePop();
            if (ev.gray) return;
            pop = document.createElement('div');
            pop.className = 'cn-ev-pop';
            pop.innerHTML = `<b>${t(ev.title)}</b>
              <div>🕐 ${CAL_WEEK.days[di].d}${lang === 'ko' ? '일' : ''} ${ev.all ? (lang === 'ko' ? '종일' : 'all day') : ev.t}</div>
              <div>📍 ${t(ev.detail.place)}</div><div>👤 ${t(ev.detail.who)}</div>
              ${ev.cancel ? `<em>${lang === 'ko' ? '취소된 일정입니다' : 'This event was cancelled'}</em>` : ''}`;
            const close = document.createElement('span');
            close.className = 'cn-ev-pop-x';
            close.textContent = '✕';
            close.addEventListener('click', closePop);
            pop.appendChild(close);
            const r = chip.getBoundingClientRect(), g = grid.getBoundingClientRect();
            pop.style.left = Math.max(0, Math.min(r.left - g.left, g.width - 270)) + 'px';
            pop.style.top = (r.bottom - g.top + 6) + 'px';
            grid.appendChild(pop);
          });
          cell.appendChild(chip);
        }
        if (mem.gone && di === 3) {
          cell.innerHTML = `<span class="cn-gone-note">${lang === 'ko' ? '퇴사한 구성원입니다' : 'This member has left'}</span>`;
        }
        row.appendChild(cell);
      });
      grid.appendChild(row);
    }
    grid.addEventListener('click', closePop);
    main.appendChild(grid);
  }

}
