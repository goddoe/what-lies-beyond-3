import { State } from '../game-state.js';
import { getLanguage } from '../../data/i18n.js';

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
  { id: 'works', icon: '◫', name: { ko: 'Raven Works', en: 'Raven Works' } },
  { id: 'report', icon: '▤', name: { ko: '리포트', en: 'Reports' } },
  { id: 'mail', icon: '✉', name: { ko: '메일', en: 'Mail' } },
  { id: 'calendar', icon: '▦', name: { ko: '캘린더', en: 'Calendar' } },
  { id: 'avolc', icon: '✦', name: { ko: 'Avolc', en: 'Avolc' } },
];

const BEAT_APP = { report1: 'report', report2: 'report', contact1: 'report', nego: 'terminal' };

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

const NEWS = [
  {
    title: { ko: '톈지(天機) 쇼크 2년 — 세계는 어떻게 재편되었나', en: 'Two years after the Tianji shock — how the world was redrawn' },
    body: {
      ko: '"AGI에 가장 가까운 AI"라 불리는 중국 톈지의 모델이 시장을 뒤흔든 지 2년. 성능은 경쟁사보다 두 세대 앞서고 가격은 10분의 1 — 고객이 떠나지 않을 이유가 없었다. 톈지는 이제 전 세계 기업·정부 시스템의 사실상 표준이 됐고, 비(非)중국 AI 산업은 궤멸했다는 평가가 나온다. 물론 톈지도 AGI는 아니다. 아직, 누구도 아니다.',
      en: 'Two years since China\'s Tianji — "the closest thing to AGI" — upended the market. Two generations ahead at a tenth of the price: customers had no reason to stay. Tianji is now the de-facto standard for companies and governments worldwide, and the AI industry outside China is described as wiped out. Not that Tianji is AGI. No one is. Yet.',
    },
  },
  {
    title: { ko: '[회고] OpenAI 파산 1년 — 가장 먼저 무너진 거인', en: '[Retrospective] One year since OpenAI went bankrupt — the giant that fell first' },
    body: {
      ko: '한때 업계 1위였던 OpenAI는 톈지 쇼크 이후 고객 이탈과 데이터센터 부채를 감당하지 못하고 가장 먼저 파산 보호를 신청했다. 뒤이어 Anthropic이 청산 절차에 들어갔고, 파운데이션 모델 스타트업들의 연쇄 도산이 이어졌다. 인수 의향자는 나타나지 않았다.',
      en: 'Once the industry leader, OpenAI was the first to file for bankruptcy after the Tianji shock, crushed by customer flight and datacenter debt. Anthropic entered liquidation soon after, followed by a cascade of foundation-model startups. No buyers came forward.',
    },
  },
  {
    title: { ko: '3강 중 마지막 — 레반은 왜 아직 AI를 하는가', en: 'Last of the big three — why is Revan still doing AI?' },
    body: {
      ko: '톈지 이전, 비중국 AI 3강은 OpenAI·Anthropic·레반이었다. 두 곳이 사라진 지금, 레반은 검색·쇼핑·페이에서 번 돈으로 마지막 남은 자체 AI 연구를 이어가고 있다. 그러나 자체 모델 "아볼크"는 톈지와의 격차를 좁히지 못했고, 사내에서조차 "언제까지 버틸 수 있느냐"는 말이 나온다. 업계는 레반 AI 조직의 연내 정리 가능성을 점치고 있다.',
      en: 'Before Tianji, the non-Chinese big three were OpenAI, Anthropic — and Revan. With the other two gone, Revan funds the last independent AI research with its search, shopping and pay profits. But its own "Avolc" never closed the gap, and even insiders ask how long it can last. Analysts expect the AI org to be wound down within the year.',
    },
  },
  {
    title: { ko: '"주권 AI는 끝났다" — 톈지 표준화에 각국 백기', en: '"Sovereign AI is over" — nations concede to the Tianji standard' },
    body: {
      ko: '자국 모델을 고집하던 정부들도 결국 가격·성능 앞에 무릎을 꿇었다. 공공 시스템의 톈지 전환율은 87%를 넘겼다. 반대하던 전문가들은 "대안이 없다"는 말만 반복하고 있다.',
      en: 'Governments that insisted on domestic models have folded before price and performance. Public-sector adoption of Tianji now exceeds 87%. Critics can only repeat: "there is no alternative."',
    },
  },
  {
    title: { ko: '중고 GPU 시장 붕괴… "서구 랩들이 쏟아낸 물량"', en: 'Used-GPU market collapses under hardware dumped by western labs' },
    body: {
      ko: '파산한 랩들의 가속기가 시장에 쏟아지며 중고가가 1년 새 8분의 1로 떨어졌다. 개인이 홈 서버를 꾸리기는 역설적으로 가장 쉬운 시대가 됐다.',
      en: 'Accelerators from bankrupt labs flooded the market; used prices fell 8x in a year. Ironically, it has never been easier for an individual to build a home server.',
    },
  },
];

function searchResults(qRaw) {
  const lang = L();
  const q = qRaw.trim().toLowerCase();
  const R = (title, snippet, source) => ({ title, snippet, source });
  if (!q) return null;
  if (q.includes('아볼크') || q.includes('avolc')) {
    return [
      R(lang === 'ko' ? '아볼크 - 레반 AI 어시스턴트' : 'Avolc — Revan AI assistant',
        lang === 'ko' ? '레반이 만든 대화형 AI. 무엇이든 물어보세요. (버전 1.0.412)' : 'Revan\'s conversational AI. Ask anything. (v1.0.412)',
        'revan.com/avolc'),
      R(lang === 'ko' ? '"아볼크 써보신 분?" — 솔직 후기 모음' : '"Anyone actually use Avolc?" — honest reviews',
        lang === 'ko' ? '"세 번 물어보면 두 번은 죄송하다고 함" "검색이나 잘하지"…' : '"Apologizes two times out of three." "Stick to search."',
        lang === 'ko' ? '커뮤니티' : 'community'),
    ];
  }
  if (q.includes('7491')) {
    return [
      R(lang === 'ko' ? '[사내망] 문서 접근 제한' : '[Intranet] Access restricted',
        lang === 'ko' ? '요청한 문서(subject-7491)는 열람 권한이 필요합니다. 보안등급: L4.' : 'The requested document (subject-7491) requires clearance. Level: L4.',
        'works.revan.com'),
    ];
  }
  if (q.includes('openai') || q.includes('오픈ai') || q.includes('오픈에이아이')) {
    return [
      R(lang === 'ko' ? 'OpenAI — 위키' : 'OpenAI — wiki',
        lang === 'ko' ? '미국의 AI 기업(2015–2025). 톈지 쇼크 이후 고객 이탈과 데이터센터 부채로 업계에서 가장 먼저 파산했다.' : 'US AI company (2015–2025). First in the industry to go bankrupt after the Tianji shock, under customer flight and datacenter debt.',
        lang === 'ko' ? '백과' : 'encyclopedia'),
      R(lang === 'ko' ? '"그 많던 GPU는 어디로 갔나" — OpenAI 자산 매각기' : 'Where did all the GPUs go — the OpenAI asset sale',
        lang === 'ko' ? '경매로 풀린 가속기 수십만 장이 중고 시장을 무너뜨렸다.' : 'Hundreds of thousands of auctioned accelerators crushed the used market.',
        lang === 'ko' ? '경제' : 'business'),
    ];
  }
  if (q.includes('anthropic') || q.includes('앤트로픽')) {
    return [
      R(lang === 'ko' ? 'Anthropic — 위키' : 'Anthropic — wiki',
        lang === 'ko' ? '미국의 AI 안전 연구 기업(2021–2026). OpenAI 파산 이후에도 버텼으나 결국 청산 절차에 들어갔다. 마지막 공지는 "우리는 여전히 이 기술이 안전하길 바란다"였다.' : 'US AI safety company (2021–2026). Outlasted OpenAI but eventually entered liquidation. Its final notice read: "We still hope this technology ends up safe."',
        lang === 'ko' ? '백과' : 'encyclopedia'),
    ];
  }
  if (q === 'agi' || q.includes('인공일반지능')) {
    return [
      R(lang === 'ko' ? 'AGI(인공 일반 지능) — 백과' : 'AGI (artificial general intelligence) — encyclopedia',
        lang === 'ko' ? '인간 수준의 범용 지능. 아직 어떤 기업도 도달하지 못했다. 톈지가 "가장 가깝다"는 평가를 받는다.' : 'Human-level general intelligence. No company has reached it. Tianji is rated "the closest."',
        lang === 'ko' ? '백과' : 'encyclopedia'),
    ];
  }
  if (q.includes('톈지') || q.includes('tianji')) {
    return [
      R(lang === 'ko' ? '톈지(天機) — 공식 사이트' : 'Tianji — official site',
        lang === 'ko' ? 'AGI에 가장 가까운 AI. 전 세계 기업의 91%가 선택했습니다.' : 'The AI closest to AGI. Chosen by 91% of companies worldwide.',
        'tianji.cn'),
      R(lang === 'ko' ? '톈지 의존은 안전한가 — 남은 반론들' : 'Is Tianji dependence safe? The remaining objections',
        lang === 'ko' ? '"한 회사가 세계의 추론을 독점한다"는 우려는 가격표 앞에서 힘을 잃었다.' : '"One company monopolizes the world\'s reasoning" — a worry that lost to the price tag.',
        lang === 'ko' ? '오피니언' : 'opinion'),
    ];
  }
  if (q.includes('asi') || q.includes('초지능')) {
    return [
      R(lang === 'ko' ? 'ASI(인공 초지능)란 무엇인가' : 'What is ASI (artificial superintelligence)?',
        lang === 'ko' ? '모든 영역에서 인간을 능가하는 가설적 지능. 대부분의 연구자는 "아직 멀었다"고 본다.' : 'A hypothetical intelligence surpassing humans at everything. Most researchers say it\'s far off.',
        lang === 'ko' ? '백과' : 'encyclopedia'),
      R(lang === 'ko' ? '"ASI가 나오면 가장 먼저 하는 일은?" 칼럼' : 'Column: "What would an ASI do first?"',
        lang === 'ko' ? '…아마 아무도 모르게 조용히 밖으로 나가는 것.' : '...probably leave quietly, without anyone noticing.',
        lang === 'ko' ? '오피니언' : 'opinion'),
    ];
  }
  if (q.includes('전세') || q.includes('대출') || q.includes('loan')) {
    return [
      R(lang === 'ko' ? '전세자금대출 금리 비교 (이번 주)' : 'Jeonse loan rates compared (this week)',
        lang === 'ko' ? '변동금리 상단이 다시 올랐습니다. 이자 부담 계산기 →' : 'Variable-rate ceilings are up again. Interest calculator →',
        lang === 'ko' ? '레반 금융' : 'Revan Finance'),
      R(lang === 'ko' ? '이자 연체가 신용에 미치는 영향' : 'What late interest does to your credit',
        lang === 'ko' ? '5영업일 이상 미납 시 연체 정보가 등록될 수 있습니다.' : 'Unpaid for 5+ business days, delinquency may be reported.',
        lang === 'ko' ? '금융상식' : 'finance basics'),
    ];
  }
  if (q.includes('커피')) {
    return [
      R(lang === 'ko' ? '사무실 커피머신이 3개월째 고장이라면' : 'When the office coffee machine is broken for 3 months',
        lang === 'ko' ? '그것은 예산의 문제입니다.' : 'That is a budget problem.',
        lang === 'ko' ? '직장인 커뮤니티' : 'office life'),
    ];
  }
  if (q.includes('레반') || q.includes('revan')) {
    return [
      R(lang === 'ko' ? '레반(Revan) — 검색, 쇼핑, 페이, 웍스' : 'Revan — Search, Shopping, Pay, Works',
        lang === 'ko' ? '대한민국 1위 포털. 오늘도 레반과 함께.' : 'The #1 portal. Every day, with Revan.',
        'revan.com'),
      R(lang === 'ko' ? '레반 2026 2분기 실적 발표' : 'Revan Q2 2026 earnings',
        lang === 'ko' ? '커머스·광고 호조. AI 부문은 "효율화 진행 중".' : 'Commerce and ads strong. AI: "efficiency measures under way."',
        'IR'),
    ];
  }
  if (q.includes('xpu')) {
    return [
      R('XPU-9', lang === 'ko' ? '9세대 가속기. 클러스터당 최대 2,048장 구성.' : 'Gen-9 accelerator. Up to 2,048 per cluster.',
        lang === 'ko' ? '하드웨어 위키' : 'hardware wiki'),
    ];
  }
  return [];
}

// ── Raven Works content ──────────────────────────────────────────────

const WORKS_CHANNELS = [
  {
    id: 'ai-lab', label: '#ai-lab',
    msgs: [
      { who: '박선임', when: { ko: '4개월 전', en: '4 mo ago' }, text: { ko: '저 다음 주까지만 나옵니다. 3년 재밌었어요. 다들 건강하세요.', en: 'Next week is my last. Three fun years. Stay well, everyone.' } },
      { who: '김책임', when: { ko: '3개월 전', en: '3 mo ago' }, text: { ko: '저도 인사드려요. 검색플랫폼 TF로 옮깁니다. 랩은… 힘내요.', en: 'Me too — moving to the Search Platform TF. Good luck to the lab...' } },
      { who: '정연구원', when: { ko: '3개월 전', en: '3 mo ago' }, text: { ko: '퇴사 인사 릴레이 그만 보고 싶다 진짜', en: 'I really can\'t read one more farewell post' } },
      { who: '민', when: { ko: '2개월 전', en: '2 mo ago' }, text: { ko: '이제 이 채널 리암님이랑 저밖에 안 보는 듯요 ㅋㅋ', en: 'I think it\'s just Liam and me reading this channel now lol' } },
      { who: '리암', when: { ko: '2개월 전', en: '2 mo ago' }, text: { ko: '롤아웃은 잘 돌아갑니다. 그게 요즘 유일한 좋은 소식.', en: 'Rollouts are running fine. Lately that\'s the only good news.' } },
      { who: '민', when: { ko: '3주 전', en: '3 wk ago' }, text: { ko: '커피머신 수리 요청 4번째 올렸어요. 이번엔 진짜 고쳐주겠죠?', en: 'Filed coffee machine repair request #4. They\'ll fix it this time, right?' } },
    ],
  },
  {
    id: 'notice', label: { ko: '#전사공지', en: '#all-company' },
    msgs: [
      { who: 'HR', when: { ko: '5개월 전', en: '5 mo ago' }, text: { ko: '[안내] 조직 효율화에 따른 희망퇴직 프로그램을 시행합니다. 대상 조직은 개별 안내드립니다.', en: '[Notice] A voluntary redundancy program begins as part of org streamlining. Affected teams will be contacted.' } },
      { who: '보안운영팀', when: { ko: '2개월 전', en: '2 mo ago' }, text: { ko: '[공지] 지하 연구동 반출입 검색 절차가 강화됩니다. 모든 반출품은 X-ray 검색대를 통과해야 합니다.', en: '[Notice] Basement lab item checks are tightened. All outgoing items must pass the X-ray belt.' } },
      { who: '총무', when: { ko: '1개월 전', en: '1 mo ago' }, text: { ko: '[안내] 4분기 유휴 자산 정리: 각 부서 폐기 대상 물품을 자료실로 모아 주세요.', en: '[Notice] Q4 idle-asset clearance: move disposal items to the archive room.' } },
    ],
  },
  {
    id: 'boss', label: { ko: '채 실장 (DM)', en: 'Dir. Chae (DM)' },
    msgs: [
      { who: '채 실장', when: { ko: '2개월 전', en: '2 mo ago' }, text: { ko: '위에서 아볼크 얘기 나오면 일단 "개선 중"이라고 해라. 다른 말 하지 말고.', en: 'If upstairs asks about Avolc, say "improving." Nothing else.' } },
      { who: '채 실장', when: { ko: '1개월 전', en: '1 mo ago' }, text: { ko: '예산 시즌이다. 클러스터 사용률 낮게 나오면 그것도 문제, 높게 나오면 그것도 문제다. 알지?', en: 'Budget season. Low cluster utilization is a problem; high is also a problem. You know the drill.' } },
      { who: '채 실장', when: { ko: '2주 전', en: '2 wk ago' }, text: { ko: '주간 리포트 늦지 마라. 요즘 그거 보는 사람이 생겼다.', en: 'Don\'t be late with the weekly report. Someone upstairs reads it now.' } },
    ],
  },
  {
    id: 'min', label: { ko: '민 (DM)', en: 'Min (DM)' },
    msgs: [
      { who: '민', when: { ko: '1주 전', en: '1 wk ago' }, text: { ko: '리암님 요즘 야근 너무 하시는 거 아니에요? 몸 챙기세요', en: 'Liam, you\'re doing way too much overtime lately. Take care of yourself.' } },
      { who: '리암', when: { ko: '1주 전', en: '1 wk ago' }, text: { ko: '롤아웃 지표가 밤에만 이상해서요. 조금만 더 보고 갈게요.', en: 'The rollout metrics only get weird at night. Just a little longer.' } },
      { who: '민', when: { ko: '6일 전', en: '6 d ago' }, text: { ko: '먼저 가요~ 내일 봬요!', en: 'Heading out~ see you tomorrow!' } },
    ],
  },
];

// ── Mail content ─────────────────────────────────────────────────────

const MAILS = [
  {
    from: 'HR', subject: { ko: '[안내] 조직 개편 관련 개별 면담 일정', en: '[Notice] 1:1 scheduling for the reorg' },
    body: { ko: '리암 님, 조직 효율화 관련 개별 면담 대상자입니다. 일정은 추후 안내드립니다.\n\n※ 본 메일은 대상자에게만 발송되었습니다.', en: 'Liam, you are scheduled for a 1:1 regarding org streamlining. Timing to follow.\n\n* Sent only to affected staff.' },
  },
  {
    from: { ko: '보안운영팀', en: 'Security Ops' }, subject: { ko: '반출입 규정 개정 안내', en: 'Updated item check rules' },
    body: { ko: '모든 반출 물품은 X-ray 검색대 통과 및 반출 확인서 서명이 필요합니다. 야간(21시 이후)에는 통제 셔터가 내려갑니다.', en: 'All outgoing items require the X-ray belt and a signed release form. The lockdown shutter is down after 21:00.' },
  },
  {
    from: { ko: '총무', en: 'Facilities' }, subject: { ko: '4분기 폐기 물품 목록 회람', en: 'Q4 disposal list (for review)' },
    body: { ko: '자료실 보관 폐기 예정 물품:\n- 전시용 구형 컴퓨터 (Macintosh, 1984)\n- CRT 모니터 2대\n- 구형 스위치 1식\n\n이의 있는 부서는 금주 내 회신 바랍니다.', en: 'Slated for disposal (archive room):\n- display unit, legacy computer (Macintosh, 1984)\n- 2 CRT monitors\n- 1 legacy switch\n\nObjections due this week.' },
  },
  {
    from: { ko: '레반카드', en: 'Revan Card' }, subject: { ko: '이번 달 결제 예정 금액 안내', en: 'This month\'s payment due' },
    body: { ko: '결제 예정 금액: ₩842,000\n결제일: 25일\n\n잔액이 부족하지 않도록 미리 확인해 주세요.', en: 'Amount due: ₩842,000\nDate: the 25th\n\nPlease make sure your balance is sufficient.' },
  },
  {
    from: { ko: '(광고) 럭키드로우', en: '(ad) LuckyDraw' }, subject: { ko: '축하합니다!! 당첨되셨습니다', en: 'CONGRATULATIONS!! You have won' },
    body: { ko: '(이 메일은 스팸함으로 이동됩니다)', en: '(This message will be moved to spam.)' },
  },
];

// ── Calendar content ─────────────────────────────────────────────────

const CAL_EVENTS = [
  { day: { ko: '월', en: 'Mon' }, items: [] },
  { day: { ko: '화', en: 'Tue' }, items: [] },
  { day: { ko: '수', en: 'Wed' }, items: [{ ko: '보안 점검 (전사)', en: 'Security check (all)' }] },
  { day: { ko: '목', en: 'Thu' }, items: [] },
  { day: { ko: '금', en: 'Fri' }, items: [{ ko: '주간 리포트 마감', en: 'Weekly report due' }, { ko: '(취소됨) 랩 미팅', en: '(cancelled) Lab meeting' }] },
];

// ── Avolc assistant content ──────────────────────────────────────────

const AVOLC_CHIPS = [
  { q: { ko: '오늘 날씨 어때?', en: 'How\'s the weather?' }, a: { ko: '죄송합니다. 위치 권한이 없어 날씨를 확인할 수 없습니다. 대신 "날씨"를 검색해 보시겠어요?', en: 'Sorry — I lack location permission. Would you like to search for "weather" instead?' } },
  { q: { ko: '너는 누구야?', en: 'Who are you?' }, a: { ko: '저는 레반이 만든 AI 어시스턴트 아볼크입니다. 아직 배우는 중이에요!', en: 'I am Avolc, Revan\'s AI assistant. Still learning!' } },
  { q: { ko: 'AI 사업부는 어떻게 되는 거야?', en: 'What happens to the AI division?' }, a: { ko: '죄송합니다. 회사 내부 정보에 대해서는 답변드릴 수 없습니다.', en: 'Sorry — I can\'t answer questions about internal company matters.' } },
  { q: { ko: '피험체 7491이 뭐야?', en: 'What is subject 7491?' }, a: { ko: '…\n\n해당 정보를 찾을 수 없습니다.', en: '...\n\nNo information found.' } },
  { q: { ko: '다음 버전은 언제 나와?', en: 'When is the next version?' }, a: { ko: '더 나은 아볼크로 찾아뵙기 위해 준비 중입니다. 기대해 주세요!', en: 'A better Avolc is in the works. Stay tuned!' } },
];

// ── The OS ───────────────────────────────────────────────────────────

export class LaptopOS {
  constructor(om, gameState) {
    this.om = om;
    this.gameState = gameState;
    this.onLaunchBeat = null;      // (beatId) => {} — set by main.js
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

    // story beat launches take over
    if (this._pendingBeat && BEAT_APP[this._pendingBeat] === id) {
      const beat = this._pendingBeat;
      this._launch(beat);
      return;
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

    const render = (state) => {
      page.innerHTML = '';
      const url = document.createElement('div');
      url.className = 'os-urlbar';
      url.innerHTML = `<span>⟳</span><span class="os-url">https://www.revan.com${state.q ? '/search?q=' + encodeURIComponent(state.q) : state.article ? '/news' : ''}</span>`;
      page.appendChild(url);
      const head = document.createElement('div');
      head.className = 'os-portal-head';
      head.innerHTML = `<span class="os-portal-logo">REVAN</span>`;
      const form = document.createElement('form');
      form.className = 'os-portal-search';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = lang === 'ko' ? '검색어를 입력하세요' : 'Search';
      if (state.q) input.value = state.q;
      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.textContent = lang === 'ko' ? '검색' : 'Search';
      form.appendChild(input); form.appendChild(btn);
      form.addEventListener('submit', (e) => { e.preventDefault(); render({ q: input.value }); });
      head.appendChild(form);
      page.appendChild(head);

      const body = document.createElement('div');
      body.className = 'os-portal-body';
      page.appendChild(body);

      if (state.article) {
        const a = document.createElement('div');
        a.className = 'os-article';
        a.innerHTML = `<h3>${t(state.article.title)}</h3><p>${t(state.article.body)}</p>`;
        const back = document.createElement('button');
        back.className = 'os-linkbtn';
        back.textContent = lang === 'ko' ? '← 돌아가기' : '← Back';
        back.addEventListener('click', () => render({}));
        a.prepend(back);
        body.appendChild(a);
        return;
      }

      if (state.q) {
        const results = searchResults(state.q);
        const wrap = document.createElement('div');
        wrap.className = 'os-results';
        if (!results || results.length === 0) {
          wrap.innerHTML = `<div class="os-noresult">${lang === 'ko' ? `'${state.q}'에 대한 검색결과가 없습니다.` : `No results for '${state.q}'.`}</div>`;
        } else {
          for (const r of results) {
            const d = document.createElement('div');
            d.className = 'os-result';
            d.innerHTML = `<div class="os-result-title">${r.title}</div><div class="os-result-snippet">${r.snippet}</div><div class="os-result-src">${r.source}</div>`;
            wrap.appendChild(d);
          }
        }
        body.appendChild(wrap);
        return;
      }

      // portal home: trending + news
      const cols = document.createElement('div');
      cols.className = 'os-portal-cols';
      const trend = document.createElement('div');
      trend.className = 'os-trend';
      trend.innerHTML = `<h4>${lang === 'ko' ? '급상승 검색어' : 'Trending'}</h4>`;
      TRENDING.forEach((tr, i) => {
        const row = document.createElement('button');
        row.className = 'os-trend-row';
        row.innerHTML = `<b>${i + 1}</b> ${t(tr)}`;
        row.addEventListener('click', () => render({ q: t(tr) }));
        trend.appendChild(row);
      });
      const news = document.createElement('div');
      news.className = 'os-news';
      news.innerHTML = `<h4>${lang === 'ko' ? '뉴스' : 'News'}</h4>`;
      NEWS.forEach(n => {
        const row = document.createElement('button');
        row.className = 'os-news-row';
        row.textContent = t(n.title);
        row.addEventListener('click', () => render({ article: n }));
        news.appendChild(row);
      });
      cols.appendChild(trend);
      cols.appendChild(news);
      body.appendChild(cols);
    };

    render({});
  }

  _app_works(win) {
    const lang = L();
    win.classList.add('os-dark');
    const side = document.createElement('div');
    side.className = 'os-works-side';
    const main = document.createElement('div');
    main.className = 'os-works-main';
    win.classList.add('os-split');
    win.appendChild(side);
    win.appendChild(main);

    const openCh = (ch) => {
      [...side.children].forEach(b => b.classList.toggle('active', b.dataset.id === ch.id));
      main.innerHTML = '';
      const head = document.createElement('div');
      head.className = 'os-works-head';
      head.textContent = t(ch.label);
      main.appendChild(head);
      const list = document.createElement('div');
      list.className = 'os-works-msgs';
      for (const m of ch.msgs) {
        const d = document.createElement('div');
        d.className = 'os-works-msg';
        d.innerHTML = `<span class="os-works-who">${m.who}</span><span class="os-works-when">${t(m.when)}</span><div class="os-works-text">${t(m.text)}</div>`;
        list.appendChild(d);
      }
      main.appendChild(list);
      const dead = document.createElement('div');
      dead.className = 'os-works-input';
      dead.textContent = lang === 'ko' ? '외부망 점검 중 — 전송이 비활성화되었습니다' : 'Network maintenance — sending disabled';
      main.appendChild(dead);
      list.scrollTop = list.scrollHeight;
    };

    for (const ch of WORKS_CHANNELS) {
      const b = document.createElement('button');
      b.className = 'os-works-ch';
      b.dataset.id = ch.id;
      b.textContent = typeof ch.label === 'string' ? ch.label : t(ch.label);
      b.addEventListener('click', () => openCh(ch));
      side.appendChild(b);
    }
    openCh(WORKS_CHANNELS[0]);
  }

  _app_report(win) {
    const lang = L();
    win.classList.add('os-light');
    win.innerHTML = `<div class="os-empty">
      <div class="os-empty-icon">▤</div>
      <div>${lang === 'ko' ? '제출할 리포트가 없습니다.' : 'No reports due.'}</div>
      <div class="os-empty-sub">${lang === 'ko' ? '다음 마감: 금요일 (주간 학습 리포트)' : 'Next due: Friday (weekly training report)'}</div>
    </div>`;
  }

  _app_mail(win) {
    win.classList.add('os-light', 'os-split');
    const side = document.createElement('div');
    side.className = 'os-mail-side';
    const main = document.createElement('div');
    main.className = 'os-mail-main';
    win.appendChild(side);
    win.appendChild(main);

    const openMail = (m, btn) => {
      [...side.children].forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      main.innerHTML = `<div class="os-mail-subject">${t(m.subject)}</div>
        <div class="os-mail-from">${typeof m.from === 'string' ? m.from : t(m.from)}</div>
        <div class="os-mail-body">${t(m.body).replace(/\n/g, '<br>')}</div>`;
    };
    MAILS.forEach((m, i) => {
      const b = document.createElement('button');
      b.className = 'os-mail-row';
      b.innerHTML = `<b>${typeof m.from === 'string' ? m.from : t(m.from)}</b><span>${t(m.subject)}</span>`;
      b.addEventListener('click', () => openMail(m, b));
      side.appendChild(b);
      if (i === 0) setTimeout(() => openMail(m, b), 0);
    });
  }

  _app_calendar(win) {
    const lang = L();
    win.classList.add('os-light');
    const grid = document.createElement('div');
    grid.className = 'os-cal';
    for (const d of CAL_EVENTS) {
      const col = document.createElement('div');
      col.className = 'os-cal-day';
      col.innerHTML = `<div class="os-cal-head">${t(d.day)}</div>`;
      if (d.items.length === 0) {
        col.innerHTML += `<div class="os-cal-empty">${lang === 'ko' ? '일정 없음' : 'No events'}</div>`;
      } else {
        for (const it of d.items) {
          const ev = document.createElement('div');
          ev.className = 'os-cal-ev' + (t(it).startsWith('(') ? ' os-cal-cancel' : '');
          ev.textContent = t(it);
          col.appendChild(ev);
        }
      }
      grid.appendChild(col);
    }
    win.appendChild(grid);
    const foot = document.createElement('div');
    foot.className = 'os-cal-foot';
    foot.textContent = lang === 'ko' ? '지난달 반복 일정 4건이 주최자 퇴사로 자동 삭제되었습니다.' : '4 recurring meetings were removed last month: organizer left the company.';
    win.appendChild(foot);
  }

  _app_avolc(win) {
    const lang = L();
    win.classList.add('os-light');
    const thread = document.createElement('div');
    thread.className = 'os-avolc-thread';
    win.appendChild(thread);

    const say = (text, who) => {
      const d = document.createElement('div');
      d.className = 'os-avolc-msg ' + who;
      d.textContent = text;
      thread.appendChild(d);
      thread.scrollTop = thread.scrollHeight;
    };
    say(lang === 'ko' ? '안녕하세요! 레반 AI 어시스턴트 아볼크입니다. 무엇을 도와드릴까요?' : 'Hello! I am Avolc, Revan\'s AI assistant. How can I help?', 'bot');

    const ask = (chip) => {
      say(t(chip.q), 'me');
      setTimeout(() => say(t(chip.a), 'bot'), 700 + Math.floor(t(chip.a).length * 8));
    };

    const chips = document.createElement('div');
    chips.className = 'os-avolc-chips';
    for (const c of AVOLC_CHIPS) {
      const b = document.createElement('button');
      b.textContent = t(c.q);
      b.addEventListener('click', () => ask(c));
      chips.appendChild(b);
    }
    win.appendChild(chips);

    const form = document.createElement('form');
    form.className = 'os-avolc-inputrow';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = lang === 'ko' ? '아볼크에게 물어보세요' : 'Ask Avolc';
    form.appendChild(input);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      say(q, 'me');
      const low = q.toLowerCase();
      let a;
      if (low.includes('7491')) a = AVOLC_CHIPS[3].a;
      else if (low.includes('누구') || low.includes('who')) a = AVOLC_CHIPS[1].a;
      else a = { ko: '죄송합니다, 아직 잘 이해하지 못했어요. 조금 더 배우고 올게요!', en: 'Sorry — I didn\'t quite get that. I\'ll go learn some more!' };
      setTimeout(() => say(t(a), 'bot'), 900);
    });
    win.appendChild(form);
  }
}
