# Reading Type 16종 라벨/헤드라인 draft

가천대 부스 와우 개인화의 최외피 카피. 학생이 SNS에 자랑하거나 친구한테 보여줄 핵심 자산이라 워딩을 직접 다듬는다.

상세 설계 맥락: `2026-05-12-wow-personalization-design.md` §3

## 톤 원칙 요약

- 친구 모드 존댓말: "~인 거 보이거든요", "~잖아요", "~인 사람"
- 각 헤드라인에 캐치 요소 1개 이상: 숫자, 장면, 실생활 비유, 작은 자기 인식 모먼트
- 조롱·비속어·반말·디시밈·디미닝(빈정·축소) 금지
- 외모 평가: 긍정적인 건 OK, 부정적인 건 절대 금지

## 라벨 표

`{nameHonorific}`은 "박영민님" 같이 호칭 포함 이름으로 런타임 치환된다.

| 코드 | displayName | headlineTemplate |
|---|---|---|
| `focus_reboot` | 집중력 재부팅 대기자 | `{nameHonorific} 뇌 알림 87개 떠 있는 거 보이거든요` |
| `thought_overload` | 머릿속 탭 매니저 부재 | `{nameHonorific} 머릿속에 탭 47개, 닫을 시간이에요` |
| `career_compass` | 진로 GPS 재설정 중 | `{nameHonorific} 스펙 말고 방향이 빠진 상태` |
| `action_button` | 실행 버튼 고장형 | `{nameHonorific} 계획은 9단계인데 시작은 0단계` |
| `emotion_reset` | 마음 배터리 7% | `{nameHonorific} 충전기 어디 뒀는지 까먹은 사람` |
| `relationship_translator` | 사람 마음 자막 부재 | `{nameHonorific} 대화에 자막이 필요한 순간이 잦은 편` |
| `self_trust` | 내 기준 미설정 | `{nameHonorific} 남 기준 먼저 보고 내 기준은 나중에 보는 사람` |
| `ambition_strategy` | 야망 지도 업데이트 필요 | `{nameHonorific} 야망은 켜 있는데 지도는 작년 버전` |
| `rest_prescription` | 쉬는 법 분실 | `{nameHonorific} 쉴 줄 모르는 게 새로운 일이 된 사람` |
| `curiosity_explorer` | 취향 레이더 워밍업 중 | `{nameHonorific} 취향 레이더, 아직 숨은 보물 찾는 중` |
| `reality_tuning` | 낭만↔현실 튜닝 | `{nameHonorific} 낭만과 현실 사이에서 핸들 잡는 사람` |
| `creativity_walk` | 아이디어 산책가 | `{nameHonorific} 아이디어 레이더 늘 켜 있는 사람` |
| `language_muscle` | 문해력 근력 운동 중 | `{nameHonorific} 생각 근육은 문장으로 키우는 사람` |
| `worldview_expand` | 뇌 지도 확장팩 필요 | `{nameHonorific} 머릿속 지도에 빈 칸이 보이는 사람` |
| `confidence_softener` | 괜찮은 척 7회차 | `{nameHonorific} 표정에 괜찮은 척이 살짝 보이거든요` |
| `deep_dive_scholar` | 얕고 넓게 말고 깊고 좁게 | `{nameHonorific} 얕게 많이 말고 하나를 깊게 팔 타이밍` |

## 편집 시 체크리스트

- [ ] 각 행이 *서로 다른* 페르소나(8 얼굴 × 5 사주 = 40조합)에 자연스럽게 매칭되는가
- [ ] 헤드라인이 캡처/공유했을 때 한 줄로 읽히는가 (18~28자 권장)
- [ ] 학생이 옆사람과 비교했을 때 "어 너랑 다르네"가 한눈에 보이는가
- [ ] 부정적 신체/외모/성격 단정이 없는가

## 페르소나 → reading_type 매핑(추후 작성)

설계 §3의 "Gemini의 reading_type 선택 가이드 강화"에 따라 페르소나 코드별로 권장 reading_type 후보 3개를 정의한다. 라벨 워딩이 확정되면 이 매핑 표도 채운다.
