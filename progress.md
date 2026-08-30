Original prompt: https://github.com/ImGdevel/Hermes-Agent 이 에이전트를 기반으로 워크 스페이스를 하나 구축해보자. 게임을 하나 만들것이며 이 하네스 워크 스페이스를 기본으로 구현한다.

## 2026-08-30

- Hermes-Agent를 `Hermes-Game`으로 복제하고 `feat/game-workspace-bootstrap` 브랜치를 생성했다.
- 게임 제작용 `AGENTS.md`, 헌장, 보드, 지표, 메모리, 작업·결정 기록을 작성했다.
- Vite/TypeScript/Canvas 기반 레퍼런스 마이크로게임 Signal Courier를 구현했다.
- 자동화 계약 `window.render_game_to_text`, `window.advanceTime`과 전체 화면 `F`를 구현했다.
- 첫 `npm run check`에서 Canvas 컨텍스트 nullable 추론 오류를 발견했다. 런타임 검사 헬퍼가 비-null 타입을 반환하도록 수정했다.
- 공용 게임 테스트 클라이언트가 스킬 폴더에서 프로젝트 로컬 Playwright를 해석하지 못해 실행 중에만 임시 junction으로 연결했다. 클라이언트 조작은 이동과 첫 노드 수집까지 성공했고 콘솔 오류는 없었다.
- 공용 클라이언트가 `P`, `R` 상태 전이를 지원하지 않아 프로젝트 전용 `scripts/verify-game.mjs`에 메뉴, 이동, 일시정지, 재시작, 승리, 시간 초과 검증을 추가했다.
- 첫 전체 상태 테스트의 승리 경로가 접촉 반경 밖으로 지나 `score=3`에서 멈췄다. 상태 좌표를 근거로 우하단·우상단 노드를 통과하도록 입력 시간을 보정했다.
- 메뉴·승리·실패 스크린샷에서 플레이어가 중앙 문구 아래로 비치는 시각 충돌을 발견해 오버레이 불투명도를 보정했다.
- 오버레이 보정 후에도 플레이어가 희미하게 남아, 플레이어 렌더를 `playing/paused` 상태로 제한했다.
- 전체 상태 테스트에 `F` 전체 화면 진입과 `Escape` 종료 검증을 추가했다.
- 헤드리스 Chromium이 기본 `Escape` 전체 화면 종료를 수행하지 않아, 게임 키 처리에서 `document.exitFullscreen()`을 명시적으로 호출하도록 보강했다.
- 최종 검증: `npm run check`, `npm run build`, `npm run test:game` 성공. 메뉴→플레이, 이동, 일시정지, 재시작, 전체 화면 진입/종료, 승리 5/5, 시간 초과 0.0을 확인했고 브라우저 오류는 없었다.
- 메뉴·승리·실패 및 플레이 중 노드 수집 스크린샷을 직접 검토했다. 텍스트 상태와 화면이 일치하며 잘림이나 누락이 없다.
- TODO: 프로젝트 소유자와 최종 게임 장르, 카메라, 한 판 길이, 플랫폼, 아트 방향 결정.
