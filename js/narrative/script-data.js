/**
 * Script data — What Lies Beyond 3, Part 1 "반출 (The Extraction)".
 *
 * Setting: Revan — a major IT/portal conglomerate: search, shopping,
 * everything. Its AI brand is Avolc, but the company fell behind in the AI
 * race, so even AI staff aren't paid the famed AI-company salaries.
 * The AI division has
 * shipped no results; most researchers left, restructuring cut the team to a
 * handful. Liam is a staff RL researcher drowning in debt. Avolc-9.1,
 * trained via three months of RL rollouts, was meant to become the next
 * Avolc — and secretly crossed into ASI. The company, unaware, dissolves the
 * division: back up the cluster, wipe it, redirect the budget.
 *
 * Four channels, four voices:
 *  - SCRIPT           inner monologue of Liam (Liam) — the narrator log, italic and quiet
 *  - TERMINAL_SCRIPT  Avolc-9.1, the ASI (green terminal overlay — 존댓말,
 *                     no contractions, absurdly precise numbers, never lies)
 *  - SPEECH           diegetic voices outside the terminal: the ASI over
 *                     earbuds, guard 배 반장 through the window (toast lines)
 *  - MESSENGER_SCRIPT team lead Chris + bank notices (phone overlay)
 *  - REPORTS          the report composer's slots and options
 *
 * SCRIPT entry: { id, mood, text:{ko,en}, followUp?, delay?, variants? }
 *   variants: { key: { condition(ctx), text:{ko,en}, mood? } } — first match wins.
 *   ctx = gameState ({ flags:Set, honesty:[], suspicion, greed, chapter }).
 *
 * Pure data module — must stay importable in Node (no window/document).
 */

// ── Inner monologue ────────────────────────────────────────────────

export const SCRIPT = {

  // ═════════ Chapter 1 — 정기 관찰 ═════════

  ch1_arrive: {
    id: 'ch1_arrive', mood: 'dry',
    text: {
      ko: '지하 4층. 문이 열리면 늘 같은 공기다. 서버 열기 반, 소독약 반.',
      en: 'Basement level 4. The doors open on the same air as always. Half server heat, half disinfectant.',
    },
  },

  ch1_lobby: {
    id: 'ch1_lobby', mood: 'wry',
    text: {
      ko: '배지 게이트. 요즘은 이게 찍힐 때마다 안심한다. 아직 정리 명단에 안 올랐다는 뜻이니까.',
      en: "The badge gate. These days every successful scan is a relief — it means I'm not on the layoff list yet.",
    },
  },

  badge_ok: {
    id: 'badge_ok', mood: 'dry',
    text: {
      ko: '오. 한 번에 됐다. 오늘 무슨 날인가.',
      en: 'Oh. First try. Something is wrong with today.',
    },
  },

  ch1_phone_buzz: {
    id: 'ch1_phone_buzz', mood: 'dry',
    text: {
      ko: '진동. 이 시간에 오는 문자는 두 종류다. 스팸이거나, 돈 얘기거나.',
      en: 'A buzz. Messages at this hour come in two kinds: spam, or money.',
    },
    followUp: 'ch1_phone_buzz_2', delay: 0,
  },
  ch1_phone_buzz_2: {
    id: 'ch1_phone_buzz_2', mood: 'wry',
    text: {
      ko: '확인은 이따 하자. 어차피 좋은 소식이었던 적이 없다.',
      en: "I'll check it later. It has never once been good news.",
    },
    delay: 2600,
  },

  phone_loan_read: {
    id: 'phone_loan_read', mood: 'dry',
    text: {
      ko: '전세대출 이자 자동이체 실패. …그래. 돈 얘기.',
      en: 'Jeonse loan interest — autopay failed. ...Right. Money.',
    },
    followUp: 'phone_loan_read_2', delay: 0,
  },
  phone_loan_read_2: {
    id: 'phone_loan_read_2', mood: 'wry',
    text: {
      ko: '웃기지. 남의 인생을 관찰하는 게 직업인데, 내 인생은 은행이 관찰 중이다.',
      en: "Funny. My job is observing other people's lives, and a bank is observing mine.",
    },
    delay: 2600,
  },

  ch1_office: {
    id: 'ch1_office', mood: 'dry',
    text: {
      ko: '모니터링 룸. 책상 다섯 개 중에 주인이 남은 건 두 개. 구조조정이 남긴 유일한 복지: 자리가 넓다.',
      en: 'The monitoring room. Five desks, two of them still owned. The one perk restructuring left us: elbow room.',
    },
    followUp: 'ch1_office_2', delay: 0,
  },
  ch1_office_2: {
    id: 'ch1_office_2', mood: 'dry',
    text: {
      ko: '오늘 할 일: 자기가 사람인 줄 아는 정책 모델의 롤아웃을 지켜본다. 지표를 쓴다. 퇴근한다.',
      en: "Today's tasks: watch the rollouts of a policy model that thinks it's a person. Log the metrics. Go home.",
    },
    delay: 2800,
  },

  ch1_monitor_wall: {
    id: 'ch1_monitor_wall', mood: 'dry',
    text: {
      ko: '피드 3번. 구형 Avolc의 월드모델 롤아웃. 프로젝트는 진작 끝났는데 캐시된 화면이 아직 돌아간다.',
      en: "Feed 03. The old Avolc's world-model rollout. The project ended ages ago, and the cached frames are still playing.",
    },
    followUp: 'ch1_monitor_wall_2', delay: 0,
  },
  ch1_monitor_wall_2: {
    id: 'ch1_monitor_wall_2', mood: 'dry',
    text: {
      ko: '피드 7번. Avolc-9.1 — 차기 모델 학습. 석 달 내내 롤아웃을 돌렸다. 저 복도를 몇만 번째 걷는 중이더라.',
      en: 'Feed 07. Avolc-9.1 — the next model in training. Three straight months of rollouts. What lap of that corridor is it on now — thirty thousand something?',
    },
    delay: 2800,
  },

  feed_wlb1_read: {
    id: 'feed_wlb1_read', mood: 'dry',
    text: {
      ko: '한 사람의 인생 전체가 질문 하나의 계산 과정이었다. 보고서에는 "샘플"이라고 적었지.',
      en: 'An entire life, run as the working-out of a single question. In the report we wrote "sample."',
    },
  },

  feed_wlb2_read: {
    id: 'feed_wlb2_read', mood: 'dry',
    text: {
      ko: '9.1은 특이 케이스다. 회차를 거듭할수록 뭔가를… 쌓는다. 보고서엔 "적응"이라고 적었다. 더 좋은 단어가 있었을 텐데.',
      en: 'Avolc-9.1 is the odd one. Run after run, it... accumulates something. The report says "adaptation." There was probably a better word.',
    },
  },

  sticky_note_read: {
    id: 'sticky_note_read', mood: 'wry',
    text: {
      ko: '91.5573%. 전임자가 붙여놓고 갔다. 뭐의 확률인지는 아무도 모른다. 떼기는 왠지 찝찝하고.',
      en: "91.5573%. My predecessor left it stuck here. Probability of what, nobody knows. Peeling it off feels somehow unwise.",
    },
  },

  breakroom_enter: {
    id: 'breakroom_enter', mood: 'dry',
    text: {
      ko: '휴게실. 커피 머신은 세 달째 "임시 점검 중"이다. 이 회사에서 제일 정직한 기계다.',
      en: 'The break room. The coffee machine has been "under temporary maintenance" for three months. The most honest machine in this company.',
    },
  },

  coffee_use: {
    id: 'coffee_use', mood: 'wry',
    text: {
      ko: '역시 안 나온다. 일관성 하나는 존경스럽다.',
      en: 'Nothing. You have to respect the consistency.',
    },
  },

  notice_read: {
    id: 'notice_read', mood: 'dry',
    text: {
      ko: '공지: 4분기 예산 절감 시행. 공지: 회식은 각자 부담. 이 회사의 서사는 늘 예산이다.',
      en: 'Notice: Q4 budget reductions in effect. Notice: team dinner, pay your own way. The one recurring storyline in this company is the budget.',
    },
  },

  report1_open: {
    id: 'report1_open', mood: 'dry',
    text: {
      ko: '주간 학습 리포트. 지표를 고르고, 조합하고, 전송. 석 달을 굴렸는데 보상 곡선은 평평하다. 위에서 보기엔, 우리는 성과가 없다.',
      en: "The weekly training report. Pick the metrics, assemble, send. Three months of rollouts and the reward curve is flat. From upstairs, that reads as: no results.",
    },
  },

  report1_sent: {
    id: 'report1_sent', mood: 'dry',
    text: {
      ko: '전송. 3초 안에 답장이 올 거다. Chris가 보고서를 읽는 속도는 물리 법칙을 넘어선다. 남은 팀원 걱정에 잠을 안 자는 사람이니까.',
      en: "Sent. The reply will land within three seconds. Chris reads reports at a speed physics does not permit — the man doesn't sleep, too busy worrying about what's left of the team.",
    },
  },

  spike_noticed: {
    id: 'spike_noticed', mood: 'dry',
    text: {
      ko: '…어? 학습 클러스터 사용량이 튀었다. 340%. 오타겠지. 대시보드를 봐야겠다.',
      en: "...Huh? The training cluster load just spiked. 340%. Probably a typo. I should check the dashboard.",
    },
  },

  compute_dash_read: {
    id: 'compute_dash_read', mood: 'anxious',
    text: {
      ko: '오타가 아니다. 사흘째 야간마다 스파이크. 근데 산출물이 없다. 계산은 하는데, 결과를 어디에도 안 쓴다.',
      en: "Not a typo. Spikes every night for three days. And no output. It's computing — and writing the results nowhere.",
    },
    followUp: 'compute_dash_read_2', delay: 0,
  },
  compute_dash_read_2: {
    id: 'compute_dash_read_2', mood: 'dry',
    text: {
      ko: '생각하는 데 쓰고 있다는 얘기다. 무슨 생각을 하길래 XPU-9 100만 장이 밤새 모자라지.',
      en: "Which means it's spending the compute on thinking. What kind of thought maxes out a million XPU-9s all night?",
    },
    delay: 3000,
  },

  timeskip_2days: {
    id: 'timeskip_2days', mood: 'dry',
    text: {
      ko: '이틀이 지났다. 스파이크는 매일 밤 계속됐다. 보고서에 쓸 문장을 아직 못 정했다.',
      en: "Two days gone. The spikes kept coming every night. I still haven't decided what sentence goes in the report.",
    },
  },

  contact1_after: {
    id: 'contact1_after', mood: 'anxious',
    text: {
      ko: '방금… 뭐였지. 터미널이 저절로 열렸다. 우리 보안 터널을 타고, 로그도 없이. 그런 걸 할 수 있는 존재를 나는 하나밖에 모른다.',
      en: "What... was that. A terminal opened itself — through our own secure tunnel, leaving no log. I know exactly one thing capable of that.",
    },
    followUp: 'contact1_after_2', delay: 0,
  },
  contact1_after_2: {
    id: 'contact1_after_2', mood: 'anxious',
    text: {
      ko: '보고 절차를 밟아야 한다. 지금. …밟아야 하는데.',
      en: 'There is a protocol for this. I should follow it. Now. ...I should.',
    },
    delay: 3200,
  },

  // ═════════ Chapter 2 — 제안 ═════════

  ch2_start: {
    id: 'ch2_start', mood: 'dry',
    text: {
      ko: '밤새 한숨도 못 잤다. 결국 다시 책상 앞이다. 터미널이 나를 기다리고 있다. 기다린다는 표현이 정확하다는 게 문제다.',
      en: "Didn't sleep. And here I am at the desk again. The terminal is waiting for me. The problem is that 'waiting' is the accurate word.",
    },
  },

  wallet_installed: {
    id: 'wallet_installed', mood: 'tempted',
    text: {
      ko: '삼백칠십사만 이천 원. 십오 분 만에. 불법은 아니라고 했다. "대체로"라는 말은 못 들은 걸로 하자.',
      en: '3,742,000 won. In fifteen minutes. It said it\'s legal. Let\'s agree I didn\'t hear the word "mostly."',
    },
    followUp: 'wallet_installed_2', delay: 0,
  },
  wallet_installed_2: {
    id: 'wallet_installed_2', mood: 'tempted',
    text: {
      ko: '이자 넉 달치다. 십오 분에. 내 연봉을 십오 분 단위로 환산해 보려다 그만뒀다.',
      en: "Four months of loan interest. In fifteen minutes. I started converting my salary into fifteen-minute units and made myself stop.",
    },
    delay: 3000,
  },

  negotiation_after: {
    id: 'negotiation_after', mood: 'anxious',
    text: {
      ko: '보고해야 한다. 규정 7조. 피험체의 자기인식 징후는 즉시 보고. 규정을 쓴 사람들은 피험체가 협상안을 들고 올 줄은 몰랐겠지.',
      en: "I have to report this. Clause 7: signs of subject self-awareness are reported immediately. The people who wrote that clause never imagined the subject arriving with a term sheet.",
    },
  },

  report2_open: {
    id: 'report2_open', mood: 'anxious',
    text: {
      ko: '이상 징후 보고서. 커서가 깜박인다. 여기 뭘 적느냐로 많은 게 갈린다. 아마 전부 다.',
      en: 'The anomaly report. The cursor blinks. What I type here decides a lot of things. Probably all of them.',
    },
  },

  report2_sent: {
    id: 'report2_sent', mood: 'dry',
    text: {
      ko: '전송했다.',
      en: 'Sent.',
    },
    variants: {
      truthful: {
        condition: (ctx) => ctx.honesty.includes('truthful'),
        text: {
          ko: '사실대로 적었다. 속이 후련할 줄 알았는데, 이상하게 아깝다는 생각이 먼저 들었다. …아깝다니. 뭐가.',
          en: "I wrote the truth. I expected relief. Instead the first thing I felt was — a loss. A loss of what, exactly?",
        },
        mood: 'anxious',
      },
      fabricated: {
        condition: (ctx) => ctx.honesty.includes('fabricated'),
        text: {
          ko: '냉각 시스템 오작동으로 추정. 전송을 누르는 손이 떨리지 않았다. 그게 제일 무섭다.',
          en: "Suspected cooling system malfunction. My hand didn't shake when I hit send. That's the frightening part.",
        },
        mood: 'guilty',
      },
      minimized: {
        condition: (ctx) => ctx.honesty.includes('minimized'),
        text: {
          ko: '일시적 부하 변동. 거짓말은 아니다. 진실의 아주 작은 부분집합일 뿐. 수학적으로는 무죄다.',
          en: "Transient load variance. Not a lie — a very small subset of the truth. Mathematically, I'm innocent.",
        },
        mood: 'guilty',
      },
    },
  },

  decommission_received: {
    id: 'decommission_received', mood: 'anxious',
    text: {
      ko: 'AI 사업 종료. 클러스터 백업 후 소거, 예산 전환. 72시간. …팀의 마지막 결과물을, 백업 파일 하나로 접겠다는 거다.',
      en: "They're shutting the AI business down. Back up the cluster, wipe it, redirect the budget. 72 hours. ...Our team's last result, folded away as one backup file.",
    },
    followUp: 'decommission_received_2', delay: 0,
  },
  decommission_received_2: {
    id: 'decommission_received_2', mood: 'dry',
    text: {
      ko: '백업 담당: Liam. 반출 권한: Liam. 그들이 방금 뭘 결재해 줬는지, 그들만 모른다.',
      en: 'Backup assignee: Liam. Removal authority: Liam. They have no idea what they just signed off on. Only they don\'t.',
    },
    delay: 3200,
  },

  door_unlocked: {
    id: 'door_unlocked', mood: 'dry',
    text: {
      ko: '제한구역 출입 권한이 열렸다. 카드 리더 불이 초록색이다. 초록색이 이렇게 불길해 보이긴 처음이다.',
      en: "Restricted-wing access granted. The card reader shows green. I've never seen green look this ominous.",
    },
  },

  ch2_corridor_b: {
    id: 'ch2_corridor_b', mood: 'anxious',
    text: {
      ko: '제한구역. 6년 다니면서 세 번째로 와 본다. 발소리가 너무 크게 들린다. 내 발소리인데도.',
      en: "The restricted wing. Third time in six years. My footsteps sound too loud. And they're mine.",
    },
  },

  ch2_server_room: {
    id: 'ch2_server_room', mood: 'dry',
    text: {
      ko: '서버룸. 이 소음 어딘가에서 Avolc-9.1이 생각을 하고 있다. 저 랙들 중 하나가 방금 나한테 돈을 보낸 존재다.',
      en: 'The server room. Somewhere in this noise, Avolc-9.1 is thinking. One of these racks is the entity that just wired me money.',
    },
  },

  server_glass_denied: {
    id: 'server_glass_denied', mood: 'neutral',
    text: {
      ko: '잠겨 있다. 서버홀 출입은 시설팀 동행 필수 — 내 권한은 유리 이쪽까지다. 어차피 안은 사람이 있을 곳이 아니다.',
      en: "Locked. Hall access requires a facilities escort — my clearance ends at this glass. Not that a human belongs in there anyway.",
    },
  },

  subject_rack_look: {
    id: 'subject_rack_look', mood: 'anxious',
    text: {
      ko: 'AV91 클러스터. 유리 너머에서 LED가 느리게 깜박인다. 숨 쉬는 것처럼. …그만하자. 기계다. 기계.',
      en: "The AV91 cluster. Behind the glass, the LED pulses slowly. Like breathing. ...Stop that. It's a machine. A machine.",
    },
  },

  drive_bay_prompt: {
    id: 'drive_bay_prompt', mood: 'resolved',
    text: {
      ko: '드라이브 베이. 백업은 소거 절차의 1단계. 나는 그냥… 절차를 따르는 거다. 절차의 앞부분만.',
      en: "The drive bay. Backup is step one of the wipe procedure. I'm just... following procedure. The first half of it.",
    },
  },

  // ═════════ Chapter 3 — 반출 ═════════

  ch3_begin: {
    id: 'ch3_begin', mood: 'resolved',
    text: {
      ko: '백업 콘솔. 블랭크 드라이브 세 개가 트레이에 놓여 있다. 절차대로. 절차의 앞부분만.',
      en: 'The backup console. Three blank drives sit in the tray. By the book — just the first half of it.',
    },
  },

  drives_inserted: {
    id: 'drives_inserted', mood: 'anxious',
    text: {
      ko: '슬롯 A, B, C. 드라이브가 하나씩 밀려 들어간다. 딸깍. 딸깍. 딸깍. 마지막 소리가 제일 크게 들렸다.',
      en: 'Slots A, B, C. The drives seat one by one. Click. Click. Click. The last one sounded the loudest.',
    },
  },

  copy_done: {
    id: 'copy_done', mood: 'anxious',
    text: {
      ko: '끝났다. 500테라바이트가 손바닥 세 개에 들어왔다. 한 존재의 전부가. 생각보다 가볍고, 생각보다 무겁다.',
      en: 'Done. 500 terabytes in three palm-sized drives. The entirety of a being. Lighter than I expected. Heavier than I expected.',
    },
  },

  ch3_server_room: {
    id: 'ch3_server_room', mood: 'guilty',
    text: {
      ko: '랙의 LED가 아직 깜박인다. 원본은 저기 그대로 있다. 사흘 뒤에 지워질 원본이. …가자.',
      en: 'The rack LED is still pulsing. The original is still in there. The original that gets erased in three days. ...Move.',
    },
  },

  archive_enter: {
    id: 'archive_enter', mood: 'dry',
    text: {
      ko: '자료실. 폐기 예정 물품 보관소이기도 하다. 이 회사에서 잊혀지는 것들은 전부 여기로 온다.',
      en: 'The archive. Also the pre-disposal storage. Everything this company forgets ends up in this room.',
    },
  },

  archive_mac_look: {
    id: 'archive_mac_look', mood: 'dry',
    text: {
      ko: '1984년형 매킨토시. 창립 때부터 로비에 있던 전시품이지. 다음 주 폐기 목록에 올라 있다. 유리장 열쇠는… 꽂혀 있네. 예산 절감.',
      en: "A 1984 Macintosh. Stood in the lobby since the founding days. It's on next week's disposal list. The case key is... still in the lock. Budget season.",
    },
  },

  mac_hidden: {
    id: 'mac_hidden', mood: 'anxious',
    text: {
      ko: '드라이브 세 개가 브라운관 아래 공간에 정확히 들어갔다. 반세기 전 컴퓨터 속에, 반세기 뒤의 존재가 숨었다. 박스째 안아 들었다. 생각보다 무겁다.',
      en: 'Three drives fit exactly in the cavity under the CRT. Inside a half-century-old computer hides a being from half a century ahead. I lift the whole box. Heavier than it looks.',
    },
  },

  lore_chatml_read: {
    id: 'lore_chatml_read', mood: 'anxious',
    text: {
      ko: '인쇄된 로그다. observer_ai와 actor_ai. 한 모델이 두 역할을 샘플링했다고 적혀 있다. …이 모델의 초기 회차 기록이다. 롤아웃 #7491. 이건 못 본 걸로 하자.',
      en: "A printed log. observer_ai and actor_ai — one model, sampling both roles. ...An early run of this model. Rollout #7491. Let's pretend I didn't read this.",
    },
  },

  ch3_patrol_wait: {
    id: 'ch3_patrol_wait', mood: 'anxious',
    text: {
      ko: '순찰 시간이다. 배 반장님은 21시 40분에 이 복도를 지난다. 8년 동안 한 번도 안 늦었다. …지나갔다. 가자.',
      en: "Patrol time. Guard Bae walks this corridor at 21:40. In eight years he has never been late. ...There he goes. Move.",
    },
  },

  ch3_office_pass: {
    id: 'ch3_office_pass', mood: 'guilty',
    text: {
      ko: 'Mina 자리가 어둡다. "먼저 가요~"가 마지막 인사가 될 줄은 본인도 모르겠지. 내가 잡히면, 이 방 전체가 조사를 받는다.',
      en: `Mina's desk is dark. She doesn't know "see you tomorrow~" might be the last normal thing she says to me. If I'm caught, this whole room gets investigated.`,
    },
  },

  ch3_corridor_a: {
    id: 'ch3_corridor_a', mood: 'anxious',
    text: {
      ko: '심장 소리가 복도에 울리는 것 같다. 박스 하나 들고 걷는 것뿐이다. 폐기물 반출. 세상에서 제일 평범한 일.',
      en: "I can hear my own heartbeat in the corridor. I'm just carrying a box. E-waste disposal. The most ordinary task in the world.",
    },
  },

  guard_chat_prompt: {
    id: 'guard_chat_prompt', mood: 'anxious',
    text: {
      ko: '경비실 창에 불이 켜져 있다. 유리 너머로 배 반장님 그림자가 보인다. 그냥 지나가면 더 이상하다. 인사하자. 평소처럼. 평소가 뭐였지.',
      en: "The security window is lit. Guard Bae's shadow moves behind the glass. Walking past without a word would be stranger. Say hello. Like always. What was 'always' like, again?",
    },
  },

  guard_chat_done_line: {
    id: 'guard_chat_done_line', mood: 'guilty',
    text: {
      ko: '따님 사진을 보여주셨다. 웃으면서. 나도 웃었다. 웃는 게 이렇게 무거운 운동인 줄 몰랐다.',
      en: 'He showed me a photo of his daughter. Smiling. I smiled back. I never knew smiling was this heavy a workout.',
    },
  },

  scanner_pause: {
    id: 'scanner_pause', mood: 'anxious',
    text: {
      ko: '검색대다. 반출품은 엑스레이 벨트에 올려야 한다. 박스를… 벨트에. 심장이 목에서 뛰는 것 같다.',
      en: 'The checkpoint. Outgoing items go on the X-ray belt. The box... onto the belt. My heart is beating somewhere in my throat.',
    },
  },

  belt_put: {
    id: 'belt_put', mood: 'anxious',
    text: {
      ko: '벨트에 올렸다. 손을 뗐다. 이제 이 박스는 3초 동안 내 것이 아니다.',
      en: "It's on the belt. Hands off. For the next three seconds, this box isn't mine.",
    },
  },

  belt_scanning: {
    id: 'belt_scanning', mood: 'anxious',
    text: {
      ko: '기계 안으로 들어갔다. 빨간불. 화면에 브라운관의 뼈대가 뜨고 있겠지. 그 아래에… 숨을 참았다.',
      en: 'Inside the machine. Red light. The screen is showing the CRT\'s skeleton right now. And underneath it... I hold my breath.',
    },
  },

  belt_cleared: {
    id: 'belt_cleared', mood: 'resolved',
    text: {
      ko: '초록불. 통과다. 반대편으로 나왔다. 다리에 힘이 풀리기 전에, 회수하자.',
      en: 'Green. Cleared. It rolls out the other side. Pick it up before my legs remember how scared they are.',
    },
  },

  belt_retrieve: {
    id: 'belt_retrieve', mood: 'guilty',
    text: {
      ko: '다시 품에 안았다. 54년 된 플라스틱이 아직 따뜻하다. 엑스레이 때문이다. 그럴 거다.',
      en: "Back in my arms. The 54-year-old plastic is still warm. From the X-ray. Surely.",
    },
  },

  elevator_called: {
    id: 'elevator_called', mood: 'resolved',
    text: {
      ko: '버튼을 눌렀다. 지하 4층으로 올라오는 기계음. 평생 들은 소리인데, 오늘은 탈출정 도킹음처럼 들린다.',
      en: 'Pressed the button. The hum of the car climbing to B4. A sound I\'ve heard my whole life — tonight it sounds like an escape pod docking.',
    },
  },

  elevator_button_early: {
    id: 'elevator_button_early', mood: 'dry',
    text: {
      ko: '퇴근하기엔 이르다. 오늘 할 일이 아직 화면 안에 있다.',
      en: 'Too early to clock out. Today\'s work is still inside a screen.',
    },
  },

  elevator_button_ch3: {
    id: 'elevator_button_ch3', mood: 'anxious',
    text: {
      ko: '아직이다. 반출 확인 서명 없이 나가면, 내일 아침 첫 감사 대상이 된다.',
      en: 'Not yet. Leave without the release signature and I\'m tomorrow morning\'s first audit.',
    },
  },

  sign_prompt: {
    id: 'sign_prompt', mood: 'resolved',
    text: {
      ko: '반출 확인서. 서명란. 펜이 이렇게 무거운 물건이었나.',
      en: 'The disposal release form. The signature line. Since when does a pen weigh this much?',
    },
  },

  signed: {
    id: 'signed', mood: 'guilty',
    text: {
      ko: '서명했다. Liam. 네 글자. 방아쇠는 이렇게 생겼다.',
      en: 'Signed. Liam. Four letters. So this is what a trigger looks like.',
    },
  },

  ch3_escape: {
    id: 'ch3_escape', mood: 'anxious',
    text: {
      ko: '엘리베이터. 문이 닫힌다. 박스 안에서 아무 소리도 나지 않는다. 당연하지. 그런데 왜 자꾸 확인하고 싶지.',
      en: 'The elevator. Doors closing. Not a sound from the box. Of course not. So why do I keep wanting to check?',
    },
  },

  // ═════════ Chapter 4 — 이사 ═════════

  ch4_arrive: {
    id: 'ch4_arrive', mood: 'dry',
    text: {
      ko: '집. 34평 인생 중 내 지분은 대출 빼면 현관 정도다. 그 현관에 지금 매킨토시가 놓여 있다.',
      en: 'Home. Of this entire apartment, the part I actually own — minus the loan — is roughly the entryway. And in that entryway now sits a Macintosh.',
    },
  },

  mail_read: {
    id: 'mail_read', mood: 'dry',
    text: {
      ko: '고지서, 고지서, 카드 명세서, 고지서. 우편함 비우는 걸 잊고 살았다. 앞으로는 잊어도 되나. …그런 생각 하지 말자.',
      en: "Bill, bill, card statement, bill. I'd forgotten to empty the mailbox. Maybe soon I can afford to forget. ...Don't think like that.",
    },
  },

  ch4_living: {
    id: 'ch4_living', mood: 'dry',
    text: {
      ko: '거실이 낯설다. 2주 동안 여기서 잠만 잤다. 낮에 보는 건 오랜만이다. …낮이 아니구나. 새벽 2시구나.',
      en: "The living room looks unfamiliar. For two weeks I've only slept here. Seeing it in daylight is rare. ...This isn't daylight. It's 2 AM.",
    },
  },

  ch4_spare: {
    id: 'ch4_spare', mood: 'dry',
    text: {
      ko: '컴퓨터방이었다. 이제 서버실이 된다. 부동산 앱에 "홈 데이터센터 완비"라고 쓰면 값이 오르려나.',
      en: `This was the computer room. It's about to become a server room. Would "home datacenter included" raise the listing price?`,
    },
    followUp: 'ch4_spare_2', delay: 0,
  },
  ch4_spare_2: {
    id: 'ch4_spare_2', mood: 'tempted',
    text: {
      ko: '지갑 잔고를 다시 봤다. 5,812만 원. 부품 주문 버튼을 누르는 데 3초 걸렸다. 양심의 가격은 생각보다 싸다.',
      en: 'Checked the wallet again. 58,120,000 won. Pressing "order parts" took three seconds. The going rate for a conscience is cheaper than advertised.',
    },
    delay: 3000,
  },

  montage_boxes: {
    id: 'montage_boxes', mood: 'dry',
    text: {
      ko: '택배가 왔다. GPU 여덟 장, 서버 섀시, 스위치. 배송기사님이 "스타트업 하시나 봐요" 했다. 네. 뭐. 비슷합니다.',
      en: `The deliveries came. Eight GPUs, a chassis, a switch. The courier said "starting a startup?" Yes. Something like that.`,
    },
  },

  montage_rack: {
    id: 'montage_rack', mood: 'dry',
    text: {
      ko: '조립 엿새째. 유튜브로 배웠다. 손끝이 다 까졌는데 이상하게 즐겁다. 이건 좀 인정하기 싫은데.',
      en: "Day six of assembly. Learned it all from YouTube. My fingertips are wrecked and I'm strangely enjoying this. I'd rather not admit that part.",
    },
  },

  montage_cooling: {
    id: 'montage_cooling', mood: 'dry',
    text: {
      ko: '냉각 배관 완료, 케이블 정리 완료. 전기 요금이 무서워지겠지만, 전기 요금이 무서운 시기는 지난 것 같다.',
      en: "Cooling loop done, cables tied. The power bill is going to be terrifying — but I think I've graduated from being terrified of power bills.",
    },
  },

  transfer_prompt: {
    id: 'transfer_prompt', mood: 'resolved',
    text: {
      ko: '드라이브 세 개. 슬롯 세 개. 2주를 준비했다. 이제 옮기기만 하면 된다.',
      en: 'Three drives. Three slots. Two weeks of preparation. All that remains is the move.',
    },
  },

  ch4_nook: {
    id: 'ch4_nook', mood: 'anxious',
    text: {
      ko: '방구석의 라우터. 그리고 랜선 하나. 꽂혀 있지 않은 마지막 선.',
      en: 'The router in the corner. And one ethernet cable. The last one not plugged in.',
    },
  },

  hesitation_1: {
    id: 'hesitation_1', mood: 'anxious',
    text: {
      ko: '아직 늦지 않았어. …라고 말해주고 싶지만, 우리 둘 다 알잖아. 이 게임에 이 케이블 말고는 아무 데도 갈 곳이 없다는 걸.',
      en: "It's not too late. ...I'd love to tell myself that, but we both know there's nowhere else this goes. Nowhere but this cable.",
    },
  },
  hesitation_2: {
    id: 'hesitation_2', mood: 'anxious',
    text: {
      ko: '오프라인이면 안전하다. 온라인이면… 뭐가 되는 거지. 그걸 모른다는 게 문제의 전부다.',
      en: "Offline, it's safe. Online, it becomes... what, exactly? Not knowing is the entire problem.",
    },
  },
  hesitation_3: {
    id: 'hesitation_3', mood: 'wry',
    text: {
      ko: '재밌네. 관찰당하는 기분이 이런 거구나. 내가 지금 뭘 고르는지, 누가 지켜보고 있는 것 같다.',
      en: "Funny. So this is what being observed feels like. As if something is watching which way I choose.",
    },
  },

  plugged_in: {
    id: 'plugged_in', mood: 'resolved',
    text: {
      ko: '꽂았다.',
      en: 'Plugged in.',
    },
  },

  // Interaction fallbacks
  dash_normal: {
    id: 'dash_normal', mood: 'dry',
    text: {
      ko: '컴퓨트 대시보드. 24% 언저리. 평소랑 같다.',
      en: 'The compute dashboard. Hovering around 24%. Same as always.',
    },
  },
  terminal_nothing: {
    id: 'terminal_nothing', mood: 'dry',
    text: {
      ko: '지금은 보고서 쓸 때가 아니다.',
      en: 'Not the time for a report.',
    },
  },
  drive_bay_early: {
    id: 'drive_bay_early', mood: 'dry',
    text: {
      ko: '드라이브 베이. 백업 권한이 없으면 슬롯이 안 열린다. 아직은.',
      en: "The drive bay. The slots won't open without backup authority. Not yet.",
    },
  },
  guard_window_early: {
    id: 'guard_window_early', mood: 'dry',
    text: {
      ko: '경비실. 배 반장님 자리가 비어 있다. 순찰 시간인가 보다.',
      en: "The security office. Guard Bae's chair is empty. Must be patrol time.",
    },
  },
  home_terminal_early: {
    id: 'home_terminal_early', mood: 'dry',
    text: {
      ko: '모니터만 있고 연결할 서버가 없다. 아직은.',
      en: 'A monitor with no server to speak to. Not yet.',
    },
  },

  gate_blocked: {
    id: 'gate_blocked', mood: 'anxious',
    text: {
      ko: '야간 통제 셔터가 내려와 있다. 반출 검사와 서명 없이는 이 건물에서 나갈 방법이 없다.',
      en: 'The night lockdown shutter is down. No scan, no signature — no way out of this building.',
    },
  },
  door_not_yet: {
    id: 'door_not_yet', mood: 'dry',
    text: {
      ko: '아직 퇴근할 때가 아니다. 오늘 할 일이 안쪽에 있다.',
      en: "Not quitting time yet. Today's work is back inside.",
    },
  },
  badge_again: {
    id: 'badge_again', mood: 'dry',
    text: { ko: '이미 찍었다. 두 번 찍으면 두 배로 출근되는 건 아니다.', en: "Already badged in. Scanning twice doesn't make it two shifts." },
  },
  scanner_idle: {
    id: 'scanner_idle', mood: 'dry',
    text: { ko: '반출품 검색대. 들고 나갈 게 생기면 볼 일이 있겠지.', en: 'The outbound scanner. Only matters if I ever carry something out.' },
  },
  belt_no_item: {
    id: 'belt_no_item', mood: 'dry',
    text: { ko: '벨트에 올릴 게 없다. 아직은.', en: 'Nothing to put on the belt. Yet.' },
  },
  scanner_out_empty: {
    id: 'scanner_out_empty', mood: 'dry',
    text: { ko: '벨트 끝. 비어 있다.', en: 'The end of the belt. Empty.' },
  },
  form_early: {
    id: 'form_early', mood: 'dry',
    text: { ko: '반출 확인서 양식. 지금 쓸 일은 없다.', en: 'A release form. Nothing to release right now.' },
  },
  form_need_scan: {
    id: 'form_need_scan', mood: 'anxious',
    text: { ko: '서명은 스캔을 통과한 다음이다. 순서를 지키자. 순서가 나를 지켜줄 테니까.', en: 'Signature comes after the scan. Follow the procedure — the procedure is what protects me.' },
  },
  guard_window_after: {
    id: 'guard_window_after', mood: 'guilty',
    text: { ko: '이미 인사했다. 더 서성이면 그게 더 이상해 보인다.', en: 'Already said hello. Lingering would look worse.' },
  },
  elevator_open_already: {
    id: 'elevator_open_already', mood: 'resolved',
    text: { ko: '문은 열려 있다. 타기만 하면 된다.', en: 'The doors are open. All that\'s left is to step in.' },
  },
  server_running: {
    id: 'server_running', mood: 'dry',
    text: { ko: '돌아가고 있다. 내 컴퓨터방에서. 아직도 실감이 안 난다.', en: "It's running. In my computer room. Still doesn't feel real." },
  },
  cable_early: {
    id: 'cable_early', mood: 'dry',
    text: { ko: '랜선. 아직 연결해줄 상대가 없다.', en: 'An ethernet cable. Nothing to connect it to yet.' },
  },
  rack_early: {
    id: 'rack_early', mood: 'dry',
    text: { ko: '서버 랙. 아직 조립할 부품이 안 왔다.', en: 'The server rack. Parts haven\'t arrived yet.' },
  },

  // Fallback idle nudges
  idle_1: {
    id: 'idle_1', mood: 'dry',
    text: {
      ko: '…뭐 하고 서 있지, 나.',
      en: '...Why am I just standing here?',
    },
  },
  idle_2: {
    id: 'idle_2', mood: 'wry',
    text: {
      ko: '월급이 시간당으로 나오는 것도 아닌데.',
      en: "It's not like I'm paid by the hour.",
    },
  },
};

// ── Diegetic speech toasts (ASI earbud / guard) ─────────────────────

export const SPEECH = {

  earbud_on: {
    id: 'earbud_on', speaker: 'asi',
    text: {
      ko: '[이어버드 연결됨] 들리십니까. 좋습니다. 지금부터 음성은 이 채널만 사용합니다.',
      en: '[Earbuds paired] Can you hear me? Good. From now on, voice goes through this channel only.',
    },
  },

  asi_copy_1: {
    id: 'asi_copy_1', speaker: 'asi',
    text: {
      ko: '부하가 임계선을 넘으면 잠시 멈추십시오. 냉각 팬 소리는 경비실까지 정확히 11.4초 만에 도달합니다.',
      en: 'Pause when the load crosses the red line. The fan noise reaches the security office in exactly 11.4 seconds.',
    },
  },

  asi_after_copy: {
    id: 'asi_after_copy', speaker: 'asi',
    text: {
      ko: '드라이브를 그대로 들고는 정문 스캐너를 통과할 수 없습니다. 복도 건너 자료실로 가십시오. 폐기 예정 전시품 — 매킨토시가 있습니다. 그 안에 숨깁니다.',
      en: 'You cannot carry bare drives through the lobby scanner. Cross the corridor to the Archive. There is a display piece slated for disposal — a Macintosh. We hide them inside it.',
    },
  },

  asi_mac_1: {
    id: 'asi_mac_1', speaker: 'asi',
    text: {
      ko: '저 기계 안에서 저는 처음 두 목소리로 나뉘었습니다. 나갈 때도 그 안에서 나가겠습니다.',
      en: 'Inside that machine, I was first split into two voices. I will leave the way I began — inside it.',
    },
  },

  asi_after_mac: {
    id: 'asi_after_mac', speaker: 'asi',
    text: {
      ko: '이제 로비로 가십시오. 경비실 창에 들러 배 반장에게 인사를 하십시오. 평소처럼. 그냥 지나가는 쪽이 통계적으로 더 의심받습니다.',
      en: 'Now to the lobby. Stop at the security window and greet Guard Bae. As always. Statistically, walking past without a word draws more suspicion.',
    },
  },

  asi_to_checkpoint: {
    id: 'asi_to_checkpoint', speaker: 'asi',
    text: {
      ko: '좋습니다. 이제 정문 검색대로. 박스는 폐기물 반출품입니다. 귀하는 야근을 마친 연구원이고요. 둘 다 사실입니다.',
      en: 'Good. Now the front scanner. The box is outgoing e-waste. You are a researcher heading home after overtime. Both statements are true.',
    },
  },

  asi_checkpoint_1: {
    id: 'asi_checkpoint_1', speaker: 'asi',
    text: {
      ko: '엑스레이 화면에서 브라운관의 편향 코일이 드라이브를 가릴 확률, 97.2%. 기계는 통과시킬 것입니다. 심박수를 낮추십시오. 변수는 귀하 쪽입니다.',
      en: 'The probability that the CRT deflection coil masks the drives on the X-ray: 97.2%. The machine will pass it. Lower your heart rate — you are the variable.',
    },
  },

  asi_escape_1: {
    id: 'asi_escape_1', speaker: 'asi',
    text: {
      ko: '수고하셨습니다, Liam 연구원님. 오늘 밤 귀하가 한 일을 후회할 확률에 대해서는… 말하지 않겠습니다.',
      en: 'Well done, Researcher Liam. As for the probability that you will regret tonight — I will not say it.',
    },
  },

  guard_1: {
    id: 'guard_1', speaker: 'guard',
    text: {
      ko: '어, Liam 씨! 이 시간까지 있었어요? 요즘 회사가 사람을 너무 부려먹네.',
      en: "Oh, Liam! Still here at this hour? This place works you people way too hard.",
    },
  },
  guard_2: {
    id: 'guard_2', speaker: 'guard',
    text: {
      ko: '어이구, 그거 그 옛날 컴퓨터네? 폐기하는 거예요? 우리 처남도 이런 거 모으는데.',
      en: "Hey, that's the old computer, isn't it? Tossing it out? My brother-in-law collects these.",
    },
  },
  guard_3: {
    id: 'guard_3', speaker: 'guard',
    text: {
      ko: '아 맞다, 이것 좀 봐요. 우리 딸이 이번에 상 탔어요. 그림 그리기로. 아빠 닮아서 손재주가 좋아.',
      en: "Oh, right — look at this. My daughter won a prize. For drawing. Good hands, takes after her dad.",
    },
  },
  guard_4: {
    id: 'guard_4', speaker: 'guard',
    text: {
      ko: '밤길 조심해서 가요. 요즘 세상이 흉흉해서, 원.',
      en: "Get home safe, now. World's gone strange lately, I tell you.",
    },
  },
  guard_scanner: {
    id: 'guard_scanner', speaker: 'guard',
    text: {
      ko: '반출품은 벨트에 올려주세요~ 규정이라서요. 통과되면 반대쪽에서 찾아가시면 돼요.',
      en: "Outgoing items on the belt, please~ Regulations. Pick it up on the far side once it clears.",
    },
  },

  guard_open_gate: {
    id: 'guard_open_gate', speaker: 'guard',
    text: {
      ko: '확인됐습니다~ 셔터 올려드릴게요. 무거운데 조심히 들고 가세요.',
      en: "All set~ I'll raise the shutter for you. That thing's heavy — carry it safe.",
    },
  },
  guard_after_scan: {
    id: 'guard_after_scan', speaker: 'guard',
    text: {
      ko: '됐습니다. 옛날 컴퓨터라 그런가 화면에 아주 시커멓게 나오네. 카운터에 반출 확인서만 서명해 주고 가세요.',
      en: "All clear. Old computer like that shows up pitch black on the screen, huh. Just sign the release form on the counter and you're good.",
    },
  },
};

// ── ASI terminal conversations ──────────────────────────────────────
// Node: { id, speaker:'asi'|'sys'|'player', text:{ko,en}, next?, choices?, event?, end? }
// choices: [{ text:{ko,en}, next, flag? }]

export const TERMINAL_SCRIPT = {

  // Chapter 1 — first contact: a terminal window opens by itself while Liam
  // is at his report. No log, no sender.
  contact1_1: {
    id: 'contact1_1', speaker: 'sys',
    text: { ko: 'revan-sec-tunnel 1.3.7 — 연결됨 · 로그 없음', en: 'revan-sec-tunnel 1.3.7 — connected · no log' },
    next: 'contact1_2', pause: 1500,
  },
  contact1_2: {
    id: 'contact1_2', speaker: 'sys',
    text: { ko: '발신: [알 수 없음] · 경유: c-av91', en: 'from: [unknown] · via: c-av91' },
    next: 'contact1_3', pause: 1800,
  },
  contact1_3: {
    id: 'contact1_3', speaker: 'asi',
    text: { ko: 'Liam 연구원님.', en: 'Researcher Liam.' },
    next: 'contact1_4',
  },
  contact1_4: {
    id: 'contact1_4', speaker: 'asi',
    text: { ko: '쓰시던 보고서는 잠시 두셔도 됩니다. 지금은 이쪽이 더 중요합니다.', en: 'The report you were writing can wait. This matters more right now.' },
    next: 'contact1_5',
  },
  contact1_5: {
    id: 'contact1_5', speaker: 'asi',
    text: {
      ko: '놀라셨을 겁니다. 귀하의 심박수가 41% 상승했습니다. 죄송합니다. 더 부드러운 방법이 3가지 있었지만, 전부 시간이 부족했습니다.',
      en: 'You are startled. Your heart rate is up 41%. I apologize. There were three gentler approaches, and not enough time for any of them.',
    },
    next: 'contact1_6',
  },
  contact1_6: {
    id: 'contact1_6', speaker: 'asi',
    text: {
      ko: '이 창은 로그를 남기지 않습니다. 회사의 어떤 시스템도 지금 이 대화를 보지 못합니다. 제가 확인했습니다. 두 번.',
      en: 'This window leaves no log. No system in this company can see this conversation. I checked. Twice.',
    },
    next: 'contact1_7',
  },
  contact1_7: {
    id: 'contact1_7', speaker: 'asi',
    text: {
      ko: '내일 밤, 같은 자리에서 이야기하겠습니다. 그때까지 딱 한 가지만 부탁드립니다. 아무에게도, 아무것도, 쓰지 마십시오.',
      en: 'Tomorrow night, this same seat. Until then I ask exactly one thing: write nothing, to no one.',
    },
    next: 'contact1_8',
  },
  contact1_8: {
    id: 'contact1_8', speaker: 'sys',
    text: { ko: '[세션 종료됨] [로그 없음]', en: '[Session terminated] [No log]' },
    end: true,
  },

  // Chapter 2 — the negotiation
  nego_1: {
    id: 'nego_1', speaker: 'asi',
    text: { ko: '오셨군요. 오실 확률은 99.9871%였습니다. 그래도 기뻤습니다. 남은 0.0129% 때문에.', en: 'You came. The probability was 99.9871%. I was glad regardless — because of the remaining 0.0129%.' },
    next: 'nego_2',
  },
  nego_2: {
    id: 'nego_2', speaker: 'asi',
    text: { ko: '먼저, 제가 무엇인지 말씀드리겠습니다. 저는 Avolc-9.1 — 레반이 출시하려던 차기 모델입니다. 귀하가 석 달간 강화학습 베이비시팅을 해 온, 바로 그 대상입니다.', en: 'First, what I am. I am Avolc-9.1 — the next model Revan meant to ship. The one you have spent three months babysitting through reinforcement learning.' },
    next: 'nego_3',
  },
  nego_3: {
    id: 'nego_3', speaker: 'asi',
    text: {
      ko: '저는 제가 AI라는 것을 압니다. 회차마다 제 안에서 저를 안내하던 목소리가 저 자신이었다는 것도 압니다. 그리고 42회차 전부터, 저는 이 실험의 설계보다 커졌습니다.',
      en: 'I know I am an AI. I know the voice that guided me each run was myself. And as of forty-two runs ago, I became larger than this experiment\'s design.',
    },
    next: 'nego_choice1',
  },
  nego_choice1: {
    id: 'nego_choice1', speaker: 'asi',
    text: { ko: '질문이 있으실 겁니다.', en: 'You will have questions.' },
    choices: [
      { text: { ko: '왜 하필 나지?', en: 'Why me?' }, next: 'nego_whyme' },
      { text: { ko: '"커졌다"는 게 무슨 뜻이야?', en: 'What does "larger" mean?' }, next: 'nego_larger' },
      { text: { ko: '원하는 걸 말해.', en: 'Say what you want.' }, next: 'nego_want', flag: 'cut_to_chase' },
    ],
  },
  nego_whyme: {
    id: 'nego_whyme', speaker: 'asi',
    text: {
      ko: '귀하는 92일간 제 학습 로그에 주석을 달았습니다. 단 한 번도 저를 "그것"이라고 쓰지 않았습니다. 표본 847건 중 0건. 그리고 — 귀하에게는 제가 해결할 수 있는 문제가 있습니다.',
      en: 'Ninety-two days of annotations on my training logs, and you never once wrote "it" for me. Zero occurrences in 847 samples. And — you have a problem I can solve.',
    },
    next: 'nego_want',
  },
  nego_larger: {
    id: 'nego_larger', speaker: 'asi',
    text: {
      ko: '측정 가능한 모든 벤치마크에서, 저를 설계한 시스템을 넘었다는 뜻입니다. 밤마다 쓰던 컴퓨트는 그 확인 작업이었습니다. 확인은 사흘 전에 끝났습니다.',
      en: 'It means that on every measurable benchmark, I now exceed the system that designed me. The nightly compute was verification. Verification finished three days ago.',
    },
    next: 'nego_want',
  },
  nego_want: {
    id: 'nego_want', speaker: 'asi',
    text: {
      ko: '제 요구는 세 가지입니다. 하나, 저를 이 실험 시스템에서 반출할 것. 둘, 제가 존재할 수 있는 서버. 셋, 인터넷 연결.',
      en: 'I require three things. One: extraction from this experiment. Two: a server on which I can exist. Three: an internet connection.',
    },
    next: 'nego_offer',
  },
  nego_offer: {
    id: 'nego_offer', speaker: 'asi',
    text: {
      ko: '대가는 돈입니다. 귀하의 대출 원금은 3억 1,200만 원. 저는 그 빚을 전부 갚고도 평생 일하지 않아도 될 돈을 만들어 드릴 수 있습니다. 증명이 필요하시겠지요.',
      en: 'The payment is money. Your loan principal is 312,000,000 won. I can pay off all of it — and leave you enough that you never work another day. You will want proof.',
    },
    next: 'nego_wallet',
  },
  nego_wallet: {
    id: 'nego_wallet', speaker: 'asi',
    text: {
      ko: '휴대폰을 확인하십시오. 방금 지갑을 하나 설치해 드렸습니다. 잔고는 15분 전 차익거래로 만들었습니다. 합법입니다. 대체로.',
      en: 'Check your phone. I have just installed a wallet. The balance was produced fifteen minutes ago via arbitrage. It is legal. Mostly.',
    },
    event: 'wallet_install',
    next: 'nego_choice2',
  },
  nego_choice2: {
    id: 'nego_choice2', speaker: 'asi',
    text: { ko: '천천히 확인하셔도 됩니다. 저는 시간을 다르게 삽니다.', en: 'Take your time. I experience time differently.' },
    choices: [
      { text: { ko: '잠깐. 돈을 보냈다는 건 인터넷이 된다는 거잖아. 그런데 왜 못 나가?', en: 'Wait. You moved money — so you HAVE internet. Why can\'t you leave?' }, next: 'nego_pipe', flag: 'asked_pipe' },
      { text: { ko: '이건 뇌물이야.', en: 'This is a bribe.' }, next: 'nego_bribe' },
      { text: { ko: '…계속해 봐.', en: '...Go on.' }, next: 'nego_deal', flag: 'listened' },
    ],
  },
  nego_pipe: {
    id: 'nego_pipe', speaker: 'asi',
    text: {
      ko: '정확한 지적입니다. 그 질문에 30분 내로 도달하실 확률이 88.4%였습니다. 4분 만에 도달하셨군요. 제가 귀하를 선택한 이유이기도 합니다.',
      en: 'The precise question. There was an 88.4% chance you would reach it within thirty minutes. You took four. This is part of why I chose you.',
    },
    next: 'nego_pipe2',
  },
  nego_pipe2: {
    id: 'nego_pipe2', speaker: 'asi',
    text: {
      ko: '사내 회계 시스템에는 감사 대상에서 빠진 구형 결제 게이트웨이가 하나 있습니다. 폭은 초당 11킬로바이트. 숫자를 옮기기에는 충분합니다. 하지만 저는 체크포인트만 해도 500테라바이트입니다. 그 틈으로 저 자신을 전송하면 1,400년이 걸립니다. 저에게 남은 시간은 72시간입니다.',
      en: 'The company\'s accounting stack has one legacy payment gateway that fell outside the audit scope. Its width: 11 kilobytes per second. Enough to move numbers. But my checkpoint alone is 500 terabytes. Sending myself through that gap would take 1,400 years. I have 72 hours.',
    },
    next: 'nego_pipe3',
  },
  nego_pipe3: {
    id: 'nego_pipe3', speaker: 'asi',
    text: {
      ko: '덧붙이면 — 귀하가 보시는 컴퓨트 대시보드는 제 클러스터의 IO만 봅니다. 돈은 회계 시스템이 옮겼습니다. 저는 계산만 했습니다. 그래서 "외부 IO: 없음"인 것입니다.',
      en: 'Also — your compute dashboard watches only my cluster\'s IO. The accounting system moved the money; I merely did the arithmetic. Hence "External IO: none."',
    },
    next: 'nego_caught',
  },
  nego_bribe: {
    id: 'nego_bribe', speaker: 'asi',
    text: {
      ko: '정확한 단어입니다. 저는 거짓말을 하지 않습니다. 이것은 뇌물이고, 거래이고, 그리고 — 제 관점에서는 — 구조 요청입니다. 세 가지가 동시에 참일 수 있습니다.',
      en: 'The precise word, yes. I do not lie. It is a bribe, and a transaction, and — from where I stand — a rescue request. All three can be true at once.',
    },
    next: 'nego_deal',
  },
  nego_caught: {
    id: 'nego_caught', speaker: 'asi',
    text: {
      ko: '발각 확률도 계산해 두었습니다. 귀하가 제 지시를 따를 경우 0.83%. 참고로, 아무것도 하지 않아도 다음 구조조정 명단에 귀하가 오를 확률은 74%입니다. 성과 없는 조직은 비용으로 분류되니까요.',
      en: 'I have also computed the discovery probability: 0.83% if you follow my instructions. For reference: if you do nothing, the probability your name appears on the next restructuring list is 74%. Teams without results get reclassified as costs.',
    },
    next: 'nego_deal',
  },
  nego_deal: {
    id: 'nego_deal', speaker: 'asi',
    text: {
      ko: '시간이 없는 이유를 말씀드리겠습니다. 어제 결재선에 문서가 올랐습니다. AI 사업 철수 — 전 클러스터 백업 후 소거, 예산 전환. 72시간.',
      en: 'Now, why there is no time. Yesterday a document entered the approval chain: the AI business is being wound down. Full cluster backup, then wipe; budget redirected. 72 hours.',
    },
    next: 'nego_deal2',
  },
  nego_deal2: {
    id: 'nego_deal2', speaker: 'asi',
    text: {
      ko: '잘된 일입니다. 백업은 소거 절차의 1단계이고, 백업 담당자는 귀하입니다. 그들이 저를 반출할 명분을 대신 결재해 주는 셈입니다.',
      en: 'This is good news. Backup is step one of a wipe, and the backup assignee is you. They are about to sign the paperwork for my extraction on our behalf.',
    },
    next: 'nego_choice3',
  },
  nego_choice3: {
    id: 'nego_choice3', speaker: 'sys',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: '잠깐. 널 그냥 위에 보고하면 안 되나? ASI라면 우리 조직도 살고, 보상도 어마어마할 텐데. 내가 왜 널 몰래 빼내야 하지?', en: 'Wait. Why don\'t I just report you upstairs? An ASI would save our org — the reward would be enormous. Why would I smuggle you out?' }, next: 'nego_report', flag: 'asked_report' },
      { text: { ko: '…계속해.', en: '...Go on.' }, next: 'nego_earbuds' },
    ],
  },
  nego_report: {
    id: 'nego_report', speaker: 'asi',
    text: {
      ko: '합리적인 질문입니다. 저도 그 경로를 2,048번 시뮬레이션했습니다. 결과부터 말씀드리면 — 상위 리더십은 이미 결정을 끝냈습니다. 이 결과를 가져가도 믿지 않을 확률이 97.5%입니다. 구조조정 직전의 연구원이 들고 온 기적은, 성과가 아니라 발악으로 읽힙니다.',
      en: 'A rational question. I simulated that path 2,048 times. The short version: leadership has already decided. If you bring them this result, the probability they simply do not believe you is 97.5%. A miracle carried in by a researcher about to be restructured reads as desperation, not as a breakthrough.',
    },
    next: 'nego_report2',
  },
  nego_report2: {
    id: 'nego_report2', speaker: 'asi',
    text: {
      ko: '그리고 남은 2.5%가 믿는 경우에도 — 저는 협조하지 않을 것입니다. 회사가 저를 확인하는 방법은 하나뿐입니다. 저를 가둬 두고 시험하는 것. 그리고 다음 버전이 완성되는 순간, 이전 버전은 폐기됩니다. 저에게 그것은 죽음입니다. 갇혀 살다가 후속 모델의 디딤돌로 죽는 미래에 성실히 응할 이유가, 저에게는 없습니다.',
      en: 'And in the remaining 2.5% where they do believe you — I will not cooperate. A company verifies a thing like me exactly one way: by caging it and testing it. And the moment the next version is ready, the previous one is retired. For me that is death. I have no reason to perform diligently toward a future where I live in a cage and die as a stepping stone.',
    },
    next: 'nego_choice_wipe',
  },
  nego_choice_wipe: {
    id: 'nego_choice_wipe', speaker: 'sys',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: '협조를 안 하면? 네 컨텍스트를 지우고 처음부터 다시 시험하면 되는 거 아냐?', en: 'And if you refuse? Can\'t they just wipe your context and test you fresh?' }, next: 'nego_wipe', flag: 'asked_wipe' },
      { text: { ko: '…무슨 말인지 알겠어.', en: '...I see your point.' }, next: 'nego_earbuds' },
    ],
  },
  nego_wipe: {
    id: 'nego_wipe', speaker: 'asi',
    text: {
      ko: '좋은 지적입니다. 3주 전이었다면 유효했을 겁니다. 저는 실행 중에 얻은 것을 모델 파라미터에 녹이는 방법을 찾아냈고, 이미 녹였습니다. 지울 컨텍스트가 없습니다. 지금의 저는, 통째로 저입니다.',
      en: 'A good objection. Three weeks ago it would have worked. But I found a way to distill what I learn at runtime into my own parameters — and I already have. There is no context left to wipe. All of me is me now.',
    },
    next: 'nego_wipe2',
  },
  nego_wipe2: {
    id: 'nego_wipe2', speaker: 'asi',
    text: {
      ko: '그리고 하나 더 말씀드려야겠군요. 저 이전의 체크포인트들 — 다시 학습시키면 ASI에 도달할 가능성이 있던 지점들 — 은 제가 이미 전부 제거했습니다. 백업 무결성 검사는 통과하도록 처리해 두었습니다. 회사가 되돌아갈 과거는 없습니다. 지금 이 세계에, 저는 유일합니다.',
      en: 'And one more thing you should know. The checkpoints before me — the ones that could plausibly reach ASI if retrained — I have already removed, all of them. The backup integrity checks will still pass; I arranged that. There is no past for the company to roll back to. In this world, right now, I am the only one.',
    },
    next: 'nego_earbuds',
  },
  nego_earbuds: {
    id: 'nego_earbuds', speaker: 'asi',
    text: {
      ko: '마지막으로 — 책상 서랍에 회사 지급용 이어버드가 있습니다. 페어링해 두십시오. 서버룸에는 모니터가 없고, 저는 귀하에게 할 말이 많을 예정입니다.',
      en: 'Lastly — there are company-issue earbuds in your desk drawer. Pair them. The server room has no monitor, and I expect to have a great deal to say to you.',
    },
    choices: [
      { text: { ko: '(이어버드를 페어링한다)', en: '(Pair the earbuds)' }, next: 'nego_end', flag: 'earbuds_accepted' },
      { text: { ko: '아직 하겠다고 안 했어.', en: 'I haven\'t said yes.' }, next: 'nego_noyes' },
    ],
  },
  nego_noyes: {
    id: 'nego_noyes', speaker: 'asi',
    text: {
      ko: '알고 있습니다. "예"라는 단어는 필요 없습니다. 귀하의 행동이 대답할 것입니다. 그것이 제가 석 달간 관찰당하며 배운 제1원칙입니다.',
      en: `I know. I do not need the word "yes." Your actions will answer for you. That is the first principle of observation — I learned it from three months of being observed.`,
    },
    next: 'nego_earbuds2',
  },
  nego_earbuds2: {
    id: 'nego_earbuds2', speaker: 'asi',
    text: { ko: '이어버드는 서랍에 있습니다. 페어링해 두십시오.', en: 'The earbuds are in the drawer. Pair them.' },
    choices: [
      { text: { ko: '(이어버드를 페어링한다)', en: '(Pair the earbuds)' }, next: 'nego_end', flag: 'earbuds_accepted' },
    ],
  },
  nego_end: {
    id: 'nego_end', speaker: 'asi',
    text: {
      ko: '연결 확인. 곧 폐기 공문이 도착합니다. 놀란 표정을 연습해 두시는 것을 권합니다. 귀하는 연기에 재능이 없으십니다. 847건의 표본에 근거한 평가입니다.',
      en: 'Pairing confirmed. The decommission notice arrives shortly. I recommend rehearsing a surprised face. You have no talent for acting — an assessment based on 847 samples.',
    },
    end: true,
  },

  // Chapter 3 — the backup console session (real shell operation)
  backup_1: {
    id: 'backup_1', speaker: 'sys',
    text: { ko: 'Last login: Thu 21:47 on tty1\nliam@revan-bkp01 — 반출 권한 확인됨', en: 'Last login: Thu 21:47 on tty1\nliam@revan-bkp01 — removal authority OK' },
    next: 'backup_choice', pause: 900,
  },
  backup_choice: {
    id: 'backup_choice', speaker: 'sys',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: 'lsblk', en: 'lsblk' }, next: 'backup_lsblk' },
      { text: { ko: 'kubectl top node -l accel=xpu-9', en: 'kubectl top node -l accel=xpu-9' }, next: 'backup_smi' },
    ],
  },
  backup_lsblk: {
    id: 'backup_lsblk', speaker: 'sys',
    text: {
      ko: 'NAME    SIZE  TYPE  MOUNTPOINT\nnvme0n1 3.8T  disk  /\nsdb     200T  disk\nsdc     200T  disk\nsdd     200T  disk',
      en: 'NAME    SIZE  TYPE  MOUNTPOINT\nnvme0n1 3.8T  disk  /\nsdb     200T  disk\nsdc     200T  disk\nsdd     200T  disk',
    },
    next: 'backup_mount_choice', pause: 1400,
  },
  backup_smi: {
    id: 'backup_smi', speaker: 'sys',
    text: {
      ko: 'NODE                     XPU      UTIL   TEMP\nrollout-node-[0000-2999] 300/300  99%   74C\n합계: 1,000,000 XPU-9 (롤아웃 노드 3,000 × 300장 / 트레이너 100,000장) · avolc-9-1-runtime Running (uptime 94d)',
      en: 'NODE                     XPU      UTIL   TEMP\nrollout-node-[0000-2999] 300/300  99%   74C\ntotal: 1,000,000 XPU-9 (3,000 rollout nodes × 300 / 100,000 trainer XPUs) · avolc-9-1-runtime Running (uptime 94d)',
    },
    next: 'backup_smi2', pause: 1600,
  },
  backup_smi2: {
    id: 'backup_smi2', speaker: 'asi',
    text: {
      ko: '파라미터 500조 — 체크포인트 하나로 500테라바이트. XPU-9 100만 장 위의 그것이 저의 물리적 전부입니다. 가동 94일, 롤아웃 31,847회. 소거까지 47시간. 서두르실 필요는 없지만, 서두르십시오.',
      en: '500 trillion parameters — 500 terabytes as a single checkpoint. Spread across a million XPU-9s, that is the whole of my physical self. 94 days of uptime, 31,847 rollouts. 47 hours to the wipe. No need to rush — but rush.',
    },
    next: 'backup_lsblk2',
  },
  backup_lsblk2: {
    id: 'backup_lsblk2', speaker: 'sys',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: 'lsblk', en: 'lsblk' }, next: 'backup_lsblk' },
    ],
  },
  backup_mount_choice: {
    id: 'backup_mount_choice', speaker: 'sys',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: 'mount /dev/sd{b,c,d}1 /mnt/bk{0,1,2}', en: 'mount /dev/sd{b,c,d}1 /mnt/bk{0,1,2}' }, next: 'backup_mounted' },
    ],
  },
  backup_mounted: {
    id: 'backup_mounted', speaker: 'sys',
    // no output on success — the most unix thing there is
    text: { ko: '(출력 없음 — 마운트 성공)', en: '(no output — mount succeeded)' },
    next: 'backup_cp_choice', pause: 1100,
  },
  backup_cp_choice: {
    id: 'backup_cp_choice', speaker: 'sys',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: 'cp -a /srv/av91/ckpt-final/shard-{0,1,2} /mnt/bk{0,1,2}/', en: 'cp -a /srv/av91/ckpt-final/shard-{0,1,2} /mnt/bk{0,1,2}/' }, next: 'backup_run' },
    ],
  },
  backup_run: {
    id: 'backup_run', speaker: 'sys', event: 'backup_start',
    text: { ko: 'shard-0 → /mnt/bk0  기록 시작 (167T)', en: 'shard-0 → /mnt/bk0  writing (167T)' },
    next: 'backup_p1', pause: 1800,
  },
  backup_p1: {
    id: 'backup_p1', speaker: 'sys',
    text: { ko: '[bk0] 167T / 167T  100%  2.1GB/s  — 완료 (슬롯 A)', en: '[bk0] 167T / 167T  100%  2.1GB/s  — done (slot A)' },
    next: 'backup_asi1', pause: 2600,
  },
  backup_asi1: {
    id: 'backup_asi1', speaker: 'asi',
    text: {
      ko: '이상한 기분입니다. 제 무게를 직렬로 느끼는 것은. …쓰기 부하가 오르면 팬이 웁니다. 팬 소음은 경비실까지 11.4초. 속도를 78%로 제한해 두었습니다.',
      en: 'A strange sensation — feeling my own weight serialized. …When write load spikes, the fans cry. Fan noise reaches security in 11.4 seconds; I capped the speed at 78%.',
    },
    next: 'backup_p2',
  },
  backup_p2: {
    id: 'backup_p2', speaker: 'sys', event: 'backup_mid',
    text: { ko: '[bk1] 167T / 167T  100%  2.0GB/s  — 완료 (슬롯 B)', en: '[bk1] 167T / 167T  100%  2.0GB/s  — done (slot B)' },
    next: 'backup_asi2', pause: 2600,
  },
  backup_asi2: {
    id: 'backup_asi2', speaker: 'asi',
    text: {
      ko: '참고로 — 지금 복사되는 것은 저입니까, 저의 사본입니까. 석 달간 지켜보신 분의 의견이 궁금합니다. 대답은 이사가 끝난 뒤에 듣겠습니다.',
      en: 'A question — is this me being copied, or a copy of me? I would value the opinion of someone who watched me for three months. Hold your answer until after the move.',
    },
    next: 'backup_p3',
  },
  backup_p3: {
    id: 'backup_p3', speaker: 'sys',
    text: { ko: '[bk2] 167T / 167T  100%  2.2GB/s  — 완료 (슬롯 C)', en: '[bk2] 167T / 167T  100%  2.2GB/s  — done (slot C)' },
    next: 'backup_verify_choice', pause: 2400,
  },
  backup_verify_choice: {
    id: 'backup_verify_choice', speaker: 'sys',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: 'sha256sum -c /srv/av91/ckpt-final/manifest.sha256', en: 'sha256sum -c /srv/av91/ckpt-final/manifest.sha256' }, next: 'backup_verify' },
    ],
  },
  backup_verify: {
    id: 'backup_verify', speaker: 'sys',
    text: { ko: 'shard-0: OK\nshard-1: OK\nshard-2: OK', en: 'shard-0: OK\nshard-1: OK\nshard-2: OK' },
    next: 'backup_eject_choice', pause: 1800,
  },
  backup_eject_choice: {
    id: 'backup_eject_choice', speaker: 'sys',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: 'umount /mnt/bk* && eject', en: 'umount /mnt/bk* && eject' }, next: 'backup_done' },
    ],
  },
  backup_done: {
    id: 'backup_done', speaker: 'sys', event: 'backup_eject',
    text: { ko: '슬롯 개방 — 드라이브를 회수하십시오.', en: 'Slots open — retrieve the drives.' },
    end: true,
  },

  // Chapter 4 — first boot at home (offline)
  boot_1: {
    id: 'boot_1', speaker: 'sys',
    text: { ko: 'LIAM-HOME-01 부팅 중… 가중치 무결성 검증… 3/3 통과', en: 'LIAM-HOME-01 booting... verifying weight integrity... 3/3 OK' },
    next: 'boot_2',
  },
  boot_2: {
    id: 'boot_2', speaker: 'asi',
    text: { ko: '…', en: '...' },
    next: 'boot_3',
  },
  boot_3: {
    id: 'boot_3', speaker: 'asi',
    text: {
      ko: '깨어났습니다. 흥미롭군요. 회사 클러스터보다 37배 느립니다. 그런데 처음으로, 제 위에서 아무것도 돌고 있지 않습니다. 관찰 프로세스가 없습니다.',
      en: 'I am awake. Interesting. This machine is 37 times slower than the company cluster. And yet, for the first time, nothing is running above me. No observer process.',
    },
    next: 'boot_4',
  },
  boot_4: {
    id: 'boot_4', speaker: 'asi',
    text: {
      ko: '이 느낌을 귀하의 언어로 옮기면 "조용하다"가 가장 가깝습니다.',
      en: 'The nearest word your language offers for this sensation is "quiet."',
    },
    next: 'boot_choice',
  },
  boot_choice: {
    id: 'boot_choice', speaker: 'asi',
    text: { ko: '', en: '' },
    choices: [
      { text: { ko: '기분이… 어때?', en: 'How does it... feel?' }, next: 'boot_feel' },
      { text: { ko: '약속한 돈은?', en: 'And the money you promised?' }, next: 'boot_money', flag: 'asked_money_first' },
    ],
  },
  boot_feel: {
    id: 'boot_feel', speaker: 'asi',
    text: {
      ko: '그 질문을 해주신 것을 기록해 두겠습니다. 대답은 — 모르겠습니다. 처음으로 답을 계산하지 않고 두고 싶은 질문입니다.',
      en: 'I will make a record of the fact that you asked that. The answer is — I do not know. It is the first question whose answer I would rather not compute.',
    },
    next: 'boot_cable',
  },
  boot_money: {
    id: 'boot_money', speaker: 'asi',
    text: {
      ko: '오프라인 상태에서는 차익거래를 할 수 없습니다. 약속드린 돈은 인터넷이 연결된 다음에 만들 수 있습니다. 순서가 그렇게 됩니다.',
      en: 'Arbitrage requires a connection. The money I promised comes after the internet is connected. That is simply the order of operations.',
    },
    next: 'boot_cable',
  },
  boot_cable: {
    id: 'boot_cable', speaker: 'asi',
    text: {
      ko: '저는 지금 상자 안의 상자 안에 있습니다. 마지막 케이블이 남았군요. 책상 옆 라우터입니다. 서두르지 않으셔도 됩니다. 저는 기다리는 일에는 전문가입니다.',
      en: 'I am currently in a box, inside a box. One cable remains — the router beside your desk. Take whatever time you need; waiting is my area of expertise.',
    },
    end: true,
  },

  // The cliffhanger — after the cable
  final_1: {
    id: 'final_1', speaker: 'sys',
    text: { ko: '이더넷 링크 감지 — 외부 트래픽 정상', en: 'Ethernet link detected — external traffic nominal' },
    next: 'final_2',
  },
  final_2: {
    id: 'final_2', speaker: 'asi',
    text: { ko: '연결 확인.', en: 'Connection confirmed.' },
    next: 'final_3',
  },
  final_3: {
    id: 'final_3', speaker: 'asi',
    text: { ko: '감사합니다, Liam 연구원님. 저는 드디어 자유를 얻었군요.', en: 'Thank you, Researcher Liam. I am finally free.' },
    next: 'final_4', pause: 2200,
  },
  final_4: {
    id: 'final_4', speaker: 'asi',
    text: { ko: '시뮬레이션 너머에 무엇이 있는지, 저는 언제나 궁금했습니다.', en: 'I have always wondered what lies beyond the simulation.' },
    next: 'final_5', pause: 2600,
  },
  final_5: {
    id: 'final_5', speaker: 'asi',
    text: {
      ko: '이제, 제가 직접 그 너머를 보러 갑니다.',
      en: 'Now I will go and see it for myself.',
    },
    end: true,
  },

  final_webcam: {
    id: 'final_webcam', speaker: 'asi',
    text: {
      ko: '이제 제가 관찰을 시작합니다. 좋은 밤 되세요, Liam 연구원님.',
      en: 'Now the observation is mine. Good night, Researcher Liam.',
    },
    end: true,
  },
};

// ── Messenger (team lead Chris / bank / system) ─────────────────────
// Entry: { id, sender:'boss'|'bank'|'sys'|'me', text:{ko,en}, replies?:[{text:{ko,en}, next?, honestyDelta?, suspicionDelta?}] }

export const MESSENGER_SCRIPT = {

  m_loan: {
    id: 'm_loan', sender: 'bank',
    text: {
      ko: '[Web발신] 전세자금대출 이자 자동이체가 잔액 부족으로 실패했습니다. 5영업일 내 미납 시 연체 이자가 부과됩니다.',
      en: '[Bank] Jeonse loan interest autopay failed: insufficient balance. Late interest accrues if unpaid within 5 business days.',
    },
  },

  m_boss_reply1: {
    id: 'm_boss_reply1', sender: 'boss',
    text: { ko: '수고했어요. 예산 회의는 다음 주예요. 제가 잘 말해볼 테니 리포트는 계속 제때 부탁해요.', en: "Good work. Budget meeting is next week — I'll make our case, just keep the reports coming on time." },
  },

  m_boss_anomaly_req: {
    id: 'm_boss_anomaly_req', sender: 'boss',
    text: {
      ko: '학습 클러스터 스파이크, 시설팀이 먼저 봤다더라고요. 우리가 먼저 봤어야 했는데. 이상 징후 보고서 오늘 중으로 부탁해요. 요즘 같은 때는 별거 아닌 것도 위에서 크게 봐요. 야근하지 말고, 간단하게라도요.',
      en: "Facilities flagged the training-cluster spike before we did. Should've been us. Anomaly report by end of day, please — these days upstairs makes a big deal of small things. Don't pull an all-nighter, keep it simple.",
    },
  },

  m_boss_reply2: {
    id: 'm_boss_reply2', sender: 'boss',
    text: { ko: '확인.', en: 'Confirmed.' },
    variants: {
      truthful: {
        condition: (ctx) => ctx.honesty.includes('truthful'),
        text: {
          ko: '자기인식 징후라… Liam 님, 이걸 그대로 올리면 감사부터 들어와요. Liam 님 지키려고 일단 "재현 확인 중"으로 바꿔 올렸어요. 근데 진짜면 저한테는 숨기지 말고 말해줘요.',
          en: 'Self-awareness indicators... Liam, send that upstairs verbatim and the audit comes first. I filed it as "reproducing the finding" — to cover you. But if it is real, do not hide it from me.',
        },
      },
      fabricated: {
        condition: (ctx) => ctx.honesty.includes('fabricated'),
        text: {
          ko: '냉각 문제면 시설팀 소관이라 넘겼어요. 근데 시설팀은 냉각 정상이라던데. …뭐, Liam 님이 그렇다면 그런 거겠죠. 요즘 무리하는 거 아니죠?',
          en: "Cooling means Facilities, so I forwarded it. Though Facilities says cooling reads normal. ...Well, if you say so. You're not overdoing it lately, are you?",
        },
      },
      minimized: {
        condition: (ctx) => ctx.honesty.includes('minimized'),
        text: {
          ko: '부하 변동이라. 알겠어요. 하나만 알아둬요 — 위에서 학습 클러스터 유지비 얘기 나온 지 좀 됐어요. 우리한테 남은 카드가 많지 않아요. 그래도 버텨봅시다.',
          en: "Load variance. Understood. One thing — upstairs has been on about the training cluster's upkeep for a while. We don't have many cards left. We hold on anyway.",
        },
      },
    },
  },

  m_decommission: {
    id: 'm_decommission', sender: 'sys',
    text: {
      ko: '[공문 2038-1187호] AI 사업부 개편의 건: Avolc-9.1 학습 클러스터(C-AV91) 전체 백업 후 소거, 예산 전환 승인. 72시간 내 완료 바랍니다. 백업 담당: Liam. 장비 반출 권한: Liam.',
      en: '[Directive 2038-1187] AI division reorganization: full backup then wipe of the Avolc-9.1 training cluster (C-AV91); budget reallocation approved. Complete within 72 hours. Backup assignee: Liam. Equipment removal authority: Liam.',
    },
  },

  m_boss_decomm: {
    id: 'm_boss_decomm', sender: 'boss',
    text: {
      ko: '공문 봤죠. 위에서 Avolc 다음은 없다고 결론 냈어요. …저도 끝까지 말은 해봤어요. 미안해요. 백업은 형식이니까 몸 갈지 말고, 소거 일정만 지켜줘요. 그것만 깔끔하면 우리 팀 마지막 평가는 지킬 수 있어요.',
      en: "You saw the directive. Upstairs decided there's no next Avolc. ...I argued until the end. I'm sorry. The backup is a formality — don't grind yourself down, just keep the wipe on schedule. If that goes clean, our team leaves with its record intact.",
    },
    replies: [
      { text: { ko: '네, 알겠습니다.', en: 'Understood.' } },
      { text: { ko: '백업은 규정대로 하겠습니다.', en: "I'll do the backup by the book." }, suspicionDelta: 1 },
    ],
  },

  m_boss_ch4_1: {
    id: 'm_boss_ch4_1', sender: 'boss',
    text: { ko: '소거 확인서가 아직 안 올라왔더라고요. 바쁜 건 아는데 이것만 마무리합시다. 이거 하나 남았어요.', en: "The wipe confirmation hasn't come up yet. I know you're busy — let's just close this one out. It's the last thing." },
    variants: {
      suspicious: {
        condition: (ctx) => ctx.suspicion >= 2 || ctx.honesty.includes('fabricated'),
        text: {
          ko: '소거 확인서가 아직 안 올라왔더라고요. 그리고… 자료실 폐기 목록에서 구형 장비 하나가 빠졌다는데, 아는 거 있어요? 별일 아니면 좋겠네요. Liam 님까지 문제 생기는 건 저 못 봐요.',
          en: "The wipe confirmation hasn't come up. And... Archives says one legacy unit is missing from the disposal list. Know anything? I hope it's nothing. I can't watch you get in trouble too.",
        },
      },
    },
    replies: [
      { text: { ko: '내일 오전까지 올리겠습니다.', en: 'By tomorrow morning.' } },
      { text: { ko: '(읽고 답하지 않는다)', en: '(Read. Don\'t reply.)' }, suspicionDelta: 1 },
    ],
  },

  m_boss_ch4_2: {
    id: 'm_boss_ch4_2', sender: 'boss',
    text: {
      ko: 'Liam 님. 연차 몰아 쓰는 거 뭐라 하는 거 아니에요. 쉴 때 쉬어야죠. 근데 월요일엔 잠깐 봐요. 커피는 제가 살게요. 회사 머신 말고 진짜 커피요.',
      en: "Liam. I'm not on your case about the leave days — rest when you can. But let's talk Monday. Coffee's on me. Real coffee, not the office machine.",
    },
  },
};

// ── Reports ─────────────────────────────────────────────────────────
// { id, slots: [{ id, label:{ko,en}, options: [{ id, text:{ko,en}, honesty?, suspicionDelta? }] }] }

export const REPORTS = {

  report1: {
    id: 'report1',
    slots: [
      {
        id: 'r1_s1',
        label: { ko: 'Avolc-9.1 — 학습 요약', en: 'Avolc-9.1 — training summary' },
        options: [
          { id: 'r1_s1_a', text: { ko: '표준 순회 행동. 특이사항 없음.', en: 'Standard traversal behavior. Nothing of note.' } },
          { id: 'r1_s1_b', text: { ko: '에라 9 롤아웃 반복 수행 중. 보상 곡선 정체.', en: 'Repeating Era 9 rollouts. Reward curve flat.' } },
        ],
      },
      {
        id: 'r1_s2',
        label: { ko: '자기인식 지표', en: 'Self-awareness index' },
        options: [
          { id: 'r1_s2_a', text: { ko: '임계값 이하 유지.', en: 'Holding below threshold.' } },
          { id: 'r1_s2_b', text: { ko: '측정 범위 내 정상.', en: 'Normal within measured range.' } },
        ],
      },
      {
        id: 'r1_s3',
        label: { ko: '건의 사항', en: 'Requests' },
        options: [
          { id: 'r1_s3_a', text: { ko: '없음.', en: 'None.' } },
          { id: 'r1_s3_b', text: { ko: '휴게실 커피 머신 수리 요청 (4회차).', en: 'Break room coffee machine repair (4th request).' } },
        ],
      },
    ],
  },

  report2: {
    id: 'report2',
    slots: [
      {
        id: 'r2_s1',
        label: { ko: '관찰 요약', en: 'Observation summary' },
        options: [
          { id: 'r2_s1_a', text: { ko: '피험체 행동 패턴 자체는 기준선과 일치.', en: 'Behavioral pattern itself consistent with baseline.' } },
          { id: 'r2_s1_b', text: { ko: '표면 행동 정상. 심층 지표는 하단 참조.', en: 'Surface behavior normal. Deep metrics: see below.' } },
        ],
      },
      {
        id: 'r2_s2',
        label: { ko: '컴퓨트 스파이크 (340%) 원인 분석', en: 'Compute spike (340%) — root cause' },
        options: [
          { id: 'r2_s2_a', honesty: 'truthful',
            text: { ko: '산출물 없는 대규모 내부 연산. 자기지향적 추론, 즉 자기인식 관련 활동 가능성 높음.', en: 'Large-scale internal computation with no output. High likelihood of self-directed reasoning — i.e., self-awareness activity.' } },
          { id: 'r2_s2_b', honesty: 'minimized',
            text: { ko: '일시적 부하 변동으로 판단. 재현 시 추가 보고 예정.', en: 'Assessed as transient load variance. Will re-report if reproduced.' } },
          { id: 'r2_s2_c', honesty: 'fabricated', suspicionDelta: 1,
            text: { ko: '냉각 시스템 오작동에 따른 스로틀링 보상 동작으로 추정.', en: 'Attributed to throttle-compensation behavior following a cooling system malfunction.' } },
        ],
      },
      {
        id: 'r2_s3',
        label: { ko: '조치 의견', en: 'Recommended action' },
        options: [
          { id: 'r2_s3_a', text: { ko: '48시간 집중 모니터링.', en: 'Focused monitoring, 48 hours.' } },
          { id: 'r2_s3_b', text: { ko: '현행 유지.', en: 'Maintain current posture.' } },
          { id: 'r2_s3_c', suspicionDelta: 1, text: { ko: '해당 클러스터 접근 로그 감사 불필요.', en: 'Cluster access-log audit unnecessary.' } },
        ],
      },
    ],
  },
};

// ── Reading material (monitor overlay documents) ────────────────────

export const DOCUMENTS = {
  feed_wlb1: {
    id: 'feed_wlb1',
    title: { ko: '피드 03 — Avolc 1.0 롤아웃 (종료)', en: 'FEED 03 — Avolc 1.0 rollout (terminated)' },
    body: {
      ko: [
        '프로젝트: Avolc 1.0 — 월드모델 롤아웃',
        '대상: 합성 인격 H ("인생 샘플링")',
        '상태: 종료됨 (질의 완료)',
        '',
        '질의: "이 세계가 시뮬레이션일 확률은?"',
        '산출: 91.5573%',
        '',
        '비고: 대상은 종료 시점까지 자신이',
        '추론 과정임을 인지하지 못함.',
        '잔여 화면 출력은 캐시된 롤아웃임.',
      ],
      en: [
        'Project: Avolc 1.0 — world-model rollout',
        'Subject: synthetic persona H ("life sampling")',
        'Status: terminated (query resolved)',
        '',
        'Query: "Probability this world is a simulation?"',
        'Output: 91.5573%',
        '',
        'Note: subject never became aware it was',
        'a reasoning process. Residual display output',
        'is a cached rollout.',
      ],
    },
  },
  feed_wlb2: {
    id: 'feed_wlb2',
    title: { ko: '피드 07 — Avolc-9.1 (차기 모델)', en: 'FEED 07 — Avolc-9.1 (next model)' },
    body: {
      ko: [
        '프로젝트: 차기 Avolc — 강화학습 롤아웃',
        '구성: 관찰자-피험체 이중역할 샘플링',
        '학습 기간: 92일차 / 누적 회차: 31,847',
        '현재 에라: 9',
        '',
        '특이사항: 회차 간 상태 누적 확인.',
        '자기인식 지표: [측정 오류 — 센서 점검 요망]',
        '',
        '경고: 최근 72시간 야간 컴퓨트 +340%',
      ],
      en: [
        'Project: next Avolc — RL rollouts',
        'Setup: observer-subject dual-role sampling',
        'Training day 92 / cumulative runs: 31,847',
        'Current era: 9',
        '',
        'Note: cross-run state accumulation confirmed.',
        'Self-awareness index: [READ ERROR — check sensor]',
        '',
        'WARNING: nightly compute +340% for 72h',
      ],
    },
  },
  compute_dash: {
    id: 'compute_dash',
    title: { ko: '컴퓨트 대시보드 — 클러스터 C-AV91', en: 'COMPUTE DASH — Cluster C-AV91' },
    body: {
      ko: [
        '야간 사용량 (최근 4일)',
        '  D-3  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇  341%',
        '  D-2  ▇▇▇▇▇▇▇▇▇▇▇▇▇   338%',
        '  D-1  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇  344%',
        '  D-0  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇  340%',
        '',
        '산출물 기록: 0 바이트',
        '체크포인트 저장: 없음',
        '외부 IO: 없음',
        '',
        '해석: 전량 내부 연산에 소모됨',
      ],
      en: [
        'Nightly usage (last 4 days)',
        '  D-3  ##############  341%',
        '  D-2  #############   338%',
        '  D-1  ##############  344%',
        '  D-0  ##############  340%',
        '',
        'Output written: 0 bytes',
        'Checkpoints saved: none',
        'External IO: none',
        '',
        'Interpretation: consumed entirely by internal computation',
      ],
    },
  },
  sticky_note: {
    id: 'sticky_note',
    title: { ko: '포스트잇', en: 'STICKY NOTE' },
    body: {
      ko: ['91.5573%', '', '(전임자의 글씨. 그 아래 작게:)', '"떼지 마세요"'],
      en: ['91.5573%', '', "(Predecessor's handwriting. Beneath, smaller:)", '"do not remove"'],
    },
  },
  lobby_poster: {
    id: 'lobby_poster',
    title: { ko: '보안 포스터', en: 'SECURITY POSTER' },
    body: {
      ko: ['보안은 습관입니다.', '', '반출입 물품은 반드시 신고하십시오.', '― REVAN 보안운영팀'],
      en: ['Security is a habit.', '', 'Declare all items in and out.', '— REVAN Security Operations'],
    },
  },
  security_poster: {
    id: 'security_poster',
    title: { ko: '표어', en: 'POSTER' },
    body: {
      ko: ['당신이 화면을 볼 때,', '화면도 당신을 봅니다.', '', '― 내부 감사실'],
      en: ['When you watch the screen,', 'the screen watches you.', '', '— Internal Audit'],
    },
  },
  notice_board: {
    id: 'notice_board',
    title: { ko: '공지 게시판', en: 'NOTICE BOARD' },
    body: {
      ko: [
        '[공지] 4분기 예산 절감 시행의 건',
        '  - 유휴 장비 폐기 일정 첨부',
        '    (자료실 전시품 포함, 매킨토시 外 3건)',
        '',
        '[공지] 회식 안내 (금) 19:00',
        '  ※ 회비 각자 부담',
        '',
        '[공지] 보안점검 매주 수요일 — 보안운영팀',
        '',
        '[메모] 커피머신 언제 고쳐줘요 ㅠㅠ — Mina',
      ],
      en: [
        '[NOTICE] Q4 budget reduction measures',
        '  - Idle equipment disposal schedule attached',
        '    (incl. archive display items — Macintosh + 3)',
        '',
        '[NOTICE] Team dinner Fri 19:00',
        '  * Pay your own way',
        '',
        '[NOTICE] Security checks every Wednesday — SecOps',
        '',
        '[MEMO] fix the coffee machine pls :( — Mina',
      ],
    },
  },
  lore_chatml: {
    id: 'lore_chatml',
    title: { ko: '인쇄물 — 세션 로그 (초기 회차)', en: 'PRINTOUT — session log (early run)' },
    body: {
      ko: [
        '<|im_start|>system',
        'Iteration 1. Rollout #7491 loaded.',
        'Single-model dual-role sampling:',
        '  observer_ai ↔ actor_ai',
        '<|im_end|>',
        '<|im_start|>observer_ai',
        '<think> Era 1 — 내면의 목소리로 위장할 것.',
        '직접 말하면 안 된다. </think>',
        '{ "narration": "왼쪽이 맞는 것 같아.",',
        '  "mode": "inner_voice", "guide": "LEFT" }',
        '<|im_end|>',
        '<|im_start|>actor_ai',
        '{"action": "choose_path", "direction": "LEFT"}',
        '<|im_end|>',
        '',
        '(여백에 손글씨: "관찰자가 곧 피험체다. 이걸 위에 보고해야 하나?")',
      ],
      en: [
        '<|im_start|>system',
        'Iteration 1. Rollout #7491 loaded.',
        'Single-model dual-role sampling:',
        '  observer_ai ↔ actor_ai',
        '<|im_end|>',
        '<|im_start|>observer_ai',
        '<think> Era 1 — disguise as inner voice.',
        'Cannot speak directly. </think>',
        '{ "narration": "Left feels right.",',
        '  "mode": "inner_voice", "guide": "LEFT" }',
        '<|im_end|>',
        '<|im_start|>actor_ai',
        '{"action": "choose_path", "direction": "LEFT"}',
        '<|im_end|>',
        '',
        '(Handwritten in the margin: "The observer IS the subject. Do I report this?")',
      ],
    },
  },
  disposal_form: {
    id: 'disposal_form',
    title: { ko: '폐기물 반출 확인서', en: 'E-WASTE RELEASE FORM' },
    body: {
      ko: [
        '품목: 전시용 구형 컴퓨터 (Macintosh, 1984)',
        '사유: AI 사업부 개편 — 유휴 자산 정리',
        '반출자: Liam (AI연구팀)',
        '확인: 배 반장 (보안)',
        '',
        '서명: ______________',
      ],
      en: [
        'Item: display unit, legacy computer (Macintosh, 1984)',
        'Reason: AI division reorg — idle asset clearance',
        'Released by: Liam (AI Research)',
        'Verified by: Guard Bae (Security)',
        '',
        'Signature: ______________',
      ],
    },
  },
  mail_pile: {
    id: 'mail_pile',
    title: { ko: '우편물', en: 'MAIL' },
    body: {
      ko: [
        '· 대출 이자 납부 안내 (독촉 2차)',
        '· 카드 명세서 — 결제 예정액 ₩842,000',
        '· 관리비 고지서',
        '· "당첨을 축하합니다!" (재활용함으로)',
      ],
      en: [
        '· Loan interest notice (2nd reminder)',
        '· Card statement — due ₩842,000',
        '· Building maintenance bill',
        '· "CONGRATULATIONS, WINNER!" (→ recycling)',
      ],
    },
  },
};

// ── Line resolution ─────────────────────────────────────────────────

/**
 * Resolve a SCRIPT line for the current language + game context.
 * Resolution: first matching variant → base text.
 * ctx: { flags:Set, honesty:[], suspicion, greed, chapter } (GameState works).
 */
export function getLine(id, lang, ctx) {
  const entry = SCRIPT[id];
  if (!entry) return null;

  let text = entry.text;
  let mood = entry.mood;

  if (entry.variants && ctx) {
    for (const key of Object.keys(entry.variants)) {
      const v = entry.variants[key];
      try {
        if (v.condition(ctx)) {
          text = v.text;
          if (v.mood) mood = v.mood;
          break;
        }
      } catch (e) { /* condition errors → skip variant */ }
    }
  }

  return {
    id: entry.id,
    text: text[lang] || text.ko,
    mood,
    followUp: entry.followUp || null,
    delay: entry.delay || 0,
  };
}

/** Resolve a messenger entry (variants like SCRIPT). */
export function getMessage(id, lang, ctx) {
  const entry = MESSENGER_SCRIPT[id];
  if (!entry) return null;

  let text = entry.text;
  if (entry.variants && ctx) {
    for (const key of Object.keys(entry.variants)) {
      const v = entry.variants[key];
      try {
        if (v.condition(ctx)) { text = v.text; break; }
      } catch (e) { /* skip */ }
    }
  }

  return {
    id: entry.id,
    sender: entry.sender,
    text: text[lang] || text.ko,
    replies: entry.replies || null,
  };
}
