# 게임 아키텍처

## 기준선

- Vite 8 + TypeScript 5.9 + 브라우저 Canvas 2D
- 논리 해상도 960×540, 단일 `<canvas>`
- 60Hz 고정 스텝, 정수 tick 시간, 시드형 PRNG
- Web Audio API, 버전형 `localStorage` JSON
- MVP 런타임 패키지 의존성 0개
- Node.js 22.12+, `package-lock.json`과 `npm ci`를 재현성 기준으로 사용
- Vitest 4.1.11 Node 환경의 순수 코어 회귀

Phaser, PixiJS, Godot, Howler와 물리 엔진은 MVP에 설치하지 않는다. Canvas 한계가 계측으로 확인되면 renderer port 아래만 PixiJS로 교체하는 spike를 첫 대안으로 둔다. 비교 근거와 전환 조건은 [기술 계획](../preproduction/TECHNICAL-PLAN.md)에 있다.

## 의존 방향

```text
main.ts (composition root)
  └─ browser adapters ──> runtime ──> pure simulation core
         │                    │                 │
         ├─ Canvas renderer   ├─ clock          ├─ state + commands
         ├─ DOM input         ├─ effect queue   ├─ gameplay systems
         ├─ Web Audio         └─ snapshots      └─ seeded RNG
         └─ localStorage
```

- 코어는 DOM, Canvas, AudioContext, localStorage와 `performance.now()`를 import하지 않는다.
- 입력·시간·저장 어댑터가 브라우저 값을 코어 형식으로 바꾼다.
- renderer는 상태를 읽기만 하고 게임 규칙을 바꾸지 않는다.
- 시스템 효과는 작은 typed effect 배열로 반환하며 전역 이벤트 버스는 두지 않는다.
- `GameState`는 JSON 직렬화 가능하고 엔티티 ID와 처리 순서는 고정한다.
- MVP에서는 ECS, 의존성 주입 컨테이너와 범용 이벤트 버스를 사용하지 않는다.

## 결정론적 실행

- 실제 플레이는 rAF delta를 accumulator에 넣고 `1000 / 60`ms 고정 step을 0회 이상 실행한다.
- 한 렌더에서 최대 5 tick만 따라잡고 초과 시간은 버리며 성능 경고를 남긴다.
- gameplay에서 `Math.random()`을 금지하고 PRNG 상태를 `GameState`에 포함한다.
- DOM 이벤트는 즉시 상태를 바꾸지 않고 다음 tick의 `InputFrame`으로 축약한다.
- 실제 플레이와 자동화는 동일 clock, input queue와 step 함수를 사용한다.

## 자동화 계약

모든 플레이 가능 빌드는 다음 전역 함수를 유지한다.

```ts
window.render_game_to_text(): string
window.advanceTime(milliseconds: number): void
```

`render_game_to_text`는 schema, seed, tick, 좌표계, 플레이어, 패킷, 중계기, 탈출과 가까운 위협을 JSON으로 반환한다. 회귀용 canonical serializer와 hash는 표시용 반올림 값에서 분리한다.

`advanceTime`은 automation accumulator에 시간을 더해 완성된 tick만 진행하고 소수 잔여를 보존한다. 0ms는 0 tick이며 automation mode에서 rAF는 상태를 동시에 진행하지 않는다.

현재 상태 hash는 표시용 반올림과 효과음을 제외한 권위 상태를 고정 필드 순서로 직렬화한 뒤 FNV-1a 32-bit로 계산한다. 같은 seed와 tick별 `InputFrame`을 10회 재생하는 Vitest가 동일 hash를 검증한다.

## 에셋 경계

- 편집 원본: `assets-src/`
- Vite import 런타임 파일: `src/assets/{sprites,audio}/`
- manifest: ID, 빌드가 해석한 URL, 종류, 크기, 라이선스 ID
- 원격 CDN과 런타임 임의 URL 금지
- `public/`은 이름을 그대로 유지해야 하는 정적 파일만 사용

## 목표 모듈 순서

빈 구조를 한 번에 만들지 않는다. M1에서 `state/commands` → `clock` → `movement` → `canvas-renderer` → `automation` 순으로 기존 동작을 보존한 뒤 combat과 relay를 추가한다. 최종 목표 구조는 기술 계획의 `src/game/core`, `model`, `systems`, `content`, `ports`, `adapters/browser`, `debug` 경계를 따른다.

## M1 구현 상태

- `src/game/core`: 수학, 60Hz accumulator, uint32 seed PRNG, 직렬화 타입
- `src/game/model`: `GameState`, `InputFrame`, 시드 기반 초기 상태
- `src/game/systems/simulation.ts`: 이동·대시·과열 사격·EMP·추격자·사수·중계기·패킷·업로드의 유일한 권위 step
- `src/game/runtime.ts`: rAF와 자동화가 공유하는 clock/input/effect 조립
- `src/game/adapters/browser`: DOM 입력, Canvas 읽기 전용 renderer, 절차 합성 음향, 입력 글리프 로더
- `src/game/debug`: canonical serializer/hash와 텍스트 상태
- `src/assets`: Vite build graph에 들어가는 로컬 입력 글리프·폰트와 런타임 manifest

순수 코어는 DOM, Canvas, AudioContext, localStorage, `performance.now()`를 import하지 않는다. Node 통합 테스트는 browser adapter를 로드하지 않고 동일한 `stepGame`만으로 2분 수직 흐름을 끝낸다.

생산 빌드는 `vite.config.ts`의 상대 base(`./`)를 사용해 정적 호스팅의 저장소 서브경로에서도 자산을 찾는다. 같은 설정은 크레딧, 에셋 manifest, Kenney CC0 고지와 두 OFL 원문을 `dist/licenses/`에 byte 그대로 방출하며 `scripts/verify-build.mjs`가 상대 URL과 원본 일치를 검사한다.

## 테스트 계층

- L0: TypeScript와 Vite 정적 검사
- L1/L2: Vitest Node의 순수 시스템·결정론·전체 런 통합 테스트
- L3: Playwright Chromium 실제 입력과 브라우저 서비스
- L4: 스크린샷과 직접 시각 검토
- L5: M2 이후 Firefox/WebKit 스모크
- L6: 실제 rAF stress scene 성능 측정

모든 플레이 변경은 입력, 텍스트 상태, 스크린샷과 콘솔 오류를 함께 확인한다.
