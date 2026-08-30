# 프로젝트 메모리

여기에는 여러 작업과 세션에서 다시 사용할 짧고 검증된 사실만 기록한다. 상세 사건은 작업 또는 결정 문서에 둔다.

## 규칙

- 최대 40개 항목을 기본 한도로 둔다.
- 각 항목은 한두 문장으로 작성하고 근거를 연결한다.
- 30일 이상 사용되지 않은 항목은 주간 리뷰에서 `stale` 여부를 검토한다.

## Active

| ID | 사실·제약·관례 | 근거 | 마지막 사용일 |
|---|---|---|---|
| MEM-001 | 플레이 가능 빌드는 `render_game_to_text`와 `advanceTime` 계약을 유지한다. | [아키텍처](../docs/game/ARCHITECTURE.md) | 2026-08-30 |
| MEM-002 | 변경 완료는 타입 검사와 빌드만으로 판단하지 않고 입력·상태·스크린샷을 함께 확인한다. | [검증 규약](../docs/game/TESTING.md) | 2026-08-30 |
| MEM-003 | SIGNAL COURIER: LAST RELAY는 중계기 사슬을 구축하고 패킷을 회수·업로드한 뒤 10분 안에 귀환하는 2D 탑다운 액션·경로 설계 로그라이트로 확정됐다. | [게임 브리프](../docs/game/GAME-BRIEF.md) | 2026-08-30 |
| MEM-004 | MVP는 Vite·TypeScript·Canvas 2D와 런타임 의존성 0개를 유지하고, 순수 60Hz 시뮬레이션 코어를 브라우저 어댑터와 분리한다. | [기술 계획](../docs/preproduction/TECHNICAL-PLAN.md) | 2026-08-30 |
| MEM-005 | 핵심 시각 자산은 직접 제작하며 외부 자산은 CC0/OFL 보조 파일만 출처·라이선스·해시·변환을 기록한 뒤 편입한다. | [아트·에셋 계획](../docs/preproduction/ART-ASSET-PLAN.md) | 2026-08-30 |
| MEM-006 | 비코드 작업은 Codex가 수행하고 코드 구현은 Claude 접근 가능 시 우선하며, 불가하면 Codex로 전환한다. Gemini는 사용하지 않는다. | [프로젝트 헌장](CHARTER.md) | 2026-08-30 |
| MEM-007 | M1 코어는 `GameState + InputFrame -> stepGame`의 60Hz 순수 시뮬레이션과 브라우저 어댑터를 분리하며, 동일 seed·입력 10회와 실제 Playwright 흐름으로 결정론과 화면을 함께 검증한다. | [M1 작업 기록](tasks/TASK-20260830-03.md) | 2026-08-30 |
| MEM-008 | 현재 빌드는 105·90·75초의 세 손설계 구역을 연속 진행하고, 엄폐 충돌·상승하는 적 압력·처치 게이트·누적 점수와 결정론적 Canvas/Web Audio 피드백을 사용한다. | [3구역 작업 기록](tasks/TASK-20260830-04.md) | 2026-08-30 |
| MEM-009 | 플레이 영상은 Canvas `captureStream`과 절차 합성 Web Audio destination을 MediaRecorder로 결합해 실제 DOM 입력 완주를 녹화하고, README에는 경량 GIF를 MP4 링크로 사용한다. | [미디어 작업 기록](tasks/TASK-20260830-05.md) | 2026-08-30 |
| MEM-010 | 새 게임은 [게임 제작 기준선](../docs/process/GAME-PRODUCTION-BASELINE.md)과 `game-production-baseline` 스킬로 저장소 정렬, 역할별 사전 제작, 위험 우선 수직 조각, 장르별 도전·피드백, 사람 검증, 공개 미디어와 회고를 반복한다. | [기준선 작업 기록](tasks/TASK-20260830-08.md) | 2026-08-30 |

## Stale

| ID | 항목 | stale 사유 | 재검증 또는 보관 결정일 |
|---|---|---|---|

## Archived index

| ID | 항목 | 보관일 | 대체 항목·사유 |
|---|---|---|---|
