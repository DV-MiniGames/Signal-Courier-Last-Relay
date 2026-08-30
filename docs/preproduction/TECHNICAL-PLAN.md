# Signal Courier 기술 계획

- 문서 상태: Preproduction Lock v1.0
- 연결 작업: `TASK-20260830-02` Signal Courier 사전 제작 기준선 확정
- 역할: 테크니컬 디렉터
- 조사일: 2026-08-30 (KST)
- 결론: **MVP는 현재의 Vite + TypeScript + 브라우저 Canvas 2D를 유지한다. 게임 엔진과 런타임 라이브러리는 추가하지 않고, 순수 시뮬레이션 코어와 브라우저 어댑터를 분리한다.**

## 1. 결정 요약

Signal Courier의 첫 제품 범위는 한 맵, 10분 하드 캡, 최대 중계기 3개, 일반 적 4종, 데스크톱 웹이다. 현재 기준선은 이미 단일 Canvas에서 입력, 상태 진행, 렌더링, Playwright 조작, 텍스트 상태, 결정론적 시간 훅을 한 번 검증했다. 이 범위에서는 엔진 도입으로 얻는 장면 편집·물리·애니메이션 기능보다 마이그레이션, 번들, 학습, 자동화 어댑터 비용이 더 크다.

최종 선택은 다음과 같다.

| 영역 | 확정 도구 |
|---|---|
| 빌드·개발 서버 | Vite 8.2.2, 정적 `dist/` 배포 |
| 언어·타입 검사 | TypeScript 5.9.3, `strict`, `tsc --noEmit` |
| 렌더링 | 브라우저 Canvas 2D 직접 구현, 단일 `<canvas>`, 논리 해상도 960×540 |
| 시뮬레이션 | 프로젝트 코드, 60Hz 고정 스텝, 시드형 PRNG, 정수 tick 시간 |
| 입력 | DOM `KeyboardEvent.code` + `PointerEvent`를 tick 단위 입력 스냅샷으로 변환 |
| 오디오 | Web Audio API 직접 사용, 짧은 샘플 버퍼 중심 |
| 저장 | 버전이 있는 JSON을 `localStorage`에 저장, 런 중간 저장 없음 |
| 단위·통합 테스트 | Vitest 4.1.11 추가 예정, Node 환경의 순수 코어 테스트 |
| 브라우저 검증 | 현재 Playwright 1.62.1 유지, Chromium 필수·Firefox/WebKit 릴리스 스모크 |
| 런타임 의존성 | 없음. Phaser, PixiJS, Howler, 물리 엔진을 MVP에 설치하지 않음 |

Node 실행 기준은 `22.12+`로 고정한다. Vite 8이 허용하는 Node 20.19+도 기술적으로 동작하지만, 새 제작 기준선은 장기 지원 계열 하나로 좁힌다. `package-lock.json`과 `npm ci`를 재현성의 기준으로 삼고 TypeScript 7 전환은 MVP 이후 별도 작업으로 둔다.

## 2. 현재 기준선 평가

### 유지할 자산

- `index.html` → `src/main.ts`의 작은 부팅 경로
- 단일 960×540 Canvas와 CSS 비율 조정
- `window.render_game_to_text()` 상태 진단 계약
- `window.advanceTime(ms)` 자동 시간 진행 계약
- Playwright의 실제 키 입력, 전체 화면, 상태 JSON, 스크린샷, 콘솔 오류 검증
- `npm run check`, `npm run build`, `npm run test:game`의 단순한 로컬 루프

### 다음 수직 조각 전에 해소할 구조 문제

- 현재 `main.ts`는 상태, 입력, 시뮬레이션, 렌더링, 브라우저 수명주기를 모두 소유한다.
- 실제 플레이는 `requestAnimationFrame`의 가변 delta를 사용하고 자동화는 별도 루프를 사용한다. 두 경로가 같은 clock과 step 함수를 공유해야 한다.
- 현재 `advanceTime()`은 0ms에도 최소 한 tick을 진행하고 ms를 반올림한다. 다음 구현에서는 잔여 시간을 보존하고 0ms는 0 tick이어야 한다.
- `performance.now()`, DOM 입력 집합, Canvas context가 게임 규칙과 같은 파일에 있어 Node 단위 테스트가 어렵다.
- 향후 난수 배치에 `Math.random()`을 사용하면 같은 입력 재생이 깨진다.
- 텍스트 상태는 현재 필요한 필드만 수동 구성한다. 새 시스템에서는 화면 판독용 요약과 회귀용 전체 상태 해시를 구분해야 한다.

이는 엔진이 없어서 생긴 문제가 아니라 경계가 아직 필요 없던 마이크로게임 단계의 결과다. M1에서 경계를 만들되 ECS, 이벤트 버스, 의존성 주입 컨테이너는 도입하지 않는다.

## 3. 제작 도구 비교

### 조사 버전

| 후보 | 조사 기준 버전 | 버전 근거 |
|---|---|---|
| Canvas 직접 구현 | HTML Canvas 2D/Web API Living Standard, 2026-08-30 MDN 기준 | 패키지 버전 없음 |
| Phaser | 4.2.1, 2026-07-09 릴리스 | [Phaser 4.2.1 공식 다운로드](https://phaser.io/download/release/v4.2.1) |
| PixiJS | npm 8.20.1, 공식 문서 안정판 표기 8.20.0 | [PixiJS 버전 페이지](https://pixijs.com/versions), [npm 8.20.1](https://www.npmjs.com/package/pixi.js/v/8.20.1) |
| Godot Web | 4.7.2-stable, 2026-08-18 릴리스 | [Godot 4.7.2 공식 릴리스](https://godotengine.org/article/maintenance-release-godot-4-7-2/) |

Context7에서 확인 가능한 버전별 문서는 Phaser 3.90, PixiJS 8.16, Godot 4.6, Vite 8.0.10까지였고, 최신 패치·메이저 상태는 각 프로젝트의 공식 릴리스와 문서로 보정했다.

### 비교표

| 기준 | Canvas 직접 구현 | Phaser 4.2.1 | PixiJS 8.20.x | Godot Web 4.7.2 |
|---|---|---|---|---|
| 성격 | 즉시 모드 2D Web API | 장면·입력·오디오·물리까지 포함한 2D 게임 프레임워크 | retained-mode GPU 2D 렌더러 | 에디터·장면·물리·오디오를 포함한 종합 엔진 |
| 브라우저 배포 | Vite의 작은 정적 JS/CSS/에셋 | Vite 번들 정적 배포, WebGL 우선 | Vite 번들 정적 배포, WebGL 우선·WebGPU 선택 | WASM, JS, PCK 등 여러 파일과 올바른 MIME/압축 필요 |
| 렌더 백엔드 | Canvas 2D, 최신 데스크톱 브라우저에 광범위 지원 | Phaser 4는 WebGL을 주력으로 하고 Canvas renderer는 공식적으로 deprecated | WebGL이 안정 기본, WebGPU 지원, Canvas fallback은 8.16부터 실험적 | Web은 Compatibility renderer의 WebGL 2만 지원 |
| 결정론·자동화 | clock, RNG, 입력을 완전히 소유하므로 가장 단순 | 엔진 TimeStep·Scene·physics clock과 테스트 훅을 맞춰야 함 | ticker를 정지하고 수동 render 가능; 게임 규칙은 별도 작성하므로 양호 | 엔진 main loop와 GDScript 상태를 JS bridge에 노출해야 하며 Playwright 직접 제어 비용이 큼 |
| 성능 | 작은 벡터/스프라이트 수에서는 충분; 배칭·컬링·캐시를 직접 관리 | 수백 스프라이트와 타일맵에 강한 WebGL 배칭 | 네 후보 중 2D 렌더링 확장 여유가 가장 큼 | 엔진 기능은 강하지만 Web WASM 시작 비용과 범용 엔진 오버헤드가 있음 |
| 제공 기능 | 없음; 필요한 것만 구현 | 카메라, loader, scene, animation, input, audio, Arcade/Matter physics | scene graph, sprite/text/graphics, asset loader, filters; 게임 규칙·물리·오디오 없음 | 시각 편집기, scene/node, animation, physics, audio, profiler, export |
| 학습·전환 비용 | 현재 팀 기준 낮음 | 중간. Phaser API와 engine lifecycle 습득, 기존 renderer 재작성 | 중간. 렌더 계층만 교체 가능하나 scene graph와 asset API 습득 필요 | 높음. GDScript/scene/editor/export 파이프라인으로 사실상 재작성 |
| 라이선스 | 브라우저 표준 API, 추가 런타임 라이선스 없음 | MIT | MIT | MIT, 배포물에 엔진 라이선스 고지 필요 |
| Signal Courier 판단 | **MVP 채택** | 기능 요구가 커질 때 재평가 | **첫 렌더러 전환 후보** | 웹 우선 조건이 바뀔 때만 재평가 |

### 가중 평가

현재 제품 범위에 대한 상대 평가다. 5점이 가장 유리하며, 성능은 추상 벤치마크가 아니라 이번 MVP의 요구 대비 여유를 뜻한다.

| 기준 | 가중치 | Canvas | Phaser | PixiJS | Godot Web |
|---|---:|---:|---:|---:|---:|
| 현재 코드·검증 계약 적합성 | 25% | 5 | 2 | 4 | 1 |
| 결정론·Playwright 자동화 | 25% | 5 | 3 | 4 | 2 |
| MVP 전달 속도·학습비용 | 20% | 5 | 4 | 3 | 3 |
| 성능 확장 여유 | 15% | 3 | 4 | 5 | 4 |
| 정적 웹 배포 단순성 | 10% | 5 | 4 | 4 | 2 |
| 라이선스·운영 단순성 | 5% | 5 | 5 | 5 | 4 |
| 가중 점수 | 100 | **94** | 66 | 80 | 47 |

PixiJS는 렌더링 성능만 보면 가장 강한 대안이다. 그러나 M1의 도형·연결선·HUD는 Canvas가 잘 처리하며, PixiJS를 써도 전투·중계기·결정론·저장은 직접 구현해야 한다. 지금은 renderer port를 지켜 나중에 PixiJS로 교체 가능한 구조를 만드는 편이 싸다.

Phaser는 제공 기능이 가장 직접적으로 게임 제작에 맞지만, 4.x가 2026년에 출시된 새 메이저이고 Canvas backend는 이미 deprecated다. 현재의 검증된 Canvas 경로를 WebGL 중심 엔진으로 옮길 만큼 타일맵·물리·애니메이션 요구가 아직 없다.

Godot은 향후 네이티브 플랫폼과 비개발자 중심의 시각 레벨 제작에는 유리하다. 반면 Web export는 WebGL 2와 WASM을 요구하고, 멀티스레드 export는 HTTPS와 cross-origin isolation 헤더가 필요하며, 기존 JS 자동화 계약을 유지하려면 custom HTML과 JavaScript bridge 작업이 추가된다. 웹 우선 MVP에는 맞지 않는다.

## 4. 모듈 아키텍처

### 의존 방향

```text
main.ts (composition root)
  └─ browser adapters ──> runtime ──> pure simulation core
         │                    │                 │
         ├─ Canvas renderer   ├─ clock          ├─ state + commands
         ├─ DOM input         ├─ event queue    ├─ gameplay systems
         ├─ Web Audio         └─ snapshots      └─ seeded RNG
         └─ localStorage
```

- 코어는 DOM, Canvas, AudioContext, localStorage, `performance.now()`를 import하지 않는다.
- 어댑터가 입력·시간·저장 데이터를 코어 형식으로 바꾸고, 코어가 낸 상태와 효과 이벤트를 렌더·오디오로 전달한다.
- renderer는 상태를 읽기만 하며 게임 규칙을 변경하지 않는다.
- 시스템 사이 통신은 전역 이벤트 버스가 아니라 한 tick이 반환하는 작은 typed effect 배열을 사용한다.

### 목표 파일 구조

```text
src/
  main.ts                       # DOM 조회와 조립만 수행
  game/
    core/
      clock.ts                  # fixed-step accumulator와 수동 tick
      rng.ts                    # uint32 시드 PRNG
      math.ts                   # Vec2, clamp, 원/AABB 충돌
      types.ts                  # 공통 불변 타입
    model/
      state.ts                  # 직렬화 가능한 GameState와 초기화
      commands.ts               # tick별 InputFrame
      events.ts                 # audio/feedback/save effect
    systems/
      movement.ts
      combat.ts
      relay.ts
      mission.ts
      director.ts
      extraction.ts
    content/
      balance.ts                # 숫자 튜닝의 단일 출처
      level.ts                  # 손으로 만든 맵·소켓·캐시 후보
    ports/
      renderer.ts
      audio.ts
      save.ts
      input.ts
    adapters/browser/
      browser-clock.ts
      canvas-renderer.ts
      dom-input.ts
      web-audio.ts
      local-storage.ts
      assets.ts
    debug/
      text-state.ts
      automation.ts
tests/
  unit/                         # 시스템·RNG·저장 schema
  integration/                  # 명령 시퀀스 전체 런
assets-src/                     # 편집 가능한 원본, 게임이 직접 읽지 않음
src/assets/                     # Vite import 대상 runtime asset
scripts/
  verify-game.mjs               # 실제 브라우저 수직 흐름
```

M1에서 위 구조를 한 번에 빈 파일로 만들지 않는다. 첫 순서는 `state/commands` → `clock` → `movement` → `canvas-renderer` → `automation`이며, 기존 화면과 상태가 같은 것을 확인한 뒤 combat/relay 모듈을 추가한다.

### 상태 모델 원칙

- `GameState`는 함수, DOM 객체, Canvas 객체, AudioNode를 포함하지 않는 JSON 직렬화 가능 데이터다.
- 엔티티 ID는 런 안에서 증가하는 정수이며 배열 순서는 ID 오름차순으로 고정한다.
- 게임 시간은 `elapsedTicks`로 저장하고 초 표시는 `elapsedTicks / 60`으로 계산한다.
- 충돌은 원과 AABB로 제한한다. 거리 비교는 가능하면 제곱 거리로 하며 gameplay 판정에 렌더 보간 좌표를 쓰지 않는다.
- 파티클, 화면 흔들기, 소리 재생 여부는 권위 상태가 아니다. 같은 gameplay RNG를 소비하지 않는다.
- MVP에서는 ECS를 사용하지 않는다. 동일 컴포넌트 조합의 동시 엔티티가 500개를 넘고 profiler가 객체 순회를 병목으로 지목할 때만 data-oriented 전환을 검토한다.

## 5. 결정론과 자동화 계약

### 고정 스텝

- 권위 시뮬레이션은 `STEP_MS = 1000 / 60` 한 값만 사용한다.
- 실제 플레이는 rAF delta를 accumulator에 넣고 0개 이상의 fixed step을 실행한 뒤 한 번 렌더한다.
- 한 렌더에서 최대 5 tick만 따라잡는다. 초과 시간은 버리고 성능 경고를 남겨 spiral of death를 막는다.
- 탭 복귀·전체 화면 전환 뒤에는 accumulator를 비우며, 백그라운드 시간을 게임에 따라잡지 않는다.
- 렌더는 선택적으로 `alpha = accumulator / STEP_MS` 보간을 사용하지만 권위 좌표는 바꾸지 않는다.

### 난수

- 런 시작 시 URL/test option 또는 저장된 mission seed에서 32비트 seed를 만든다.
- 작은 프로젝트 소유 PRNG 한 개를 사용하고 PRNG state를 `GameState`에 포함한다. `Math.random()`은 gameplay 코드에서 금지한다.
- 적 생성, 캐시 배치, 강화 제안은 정해진 시스템 순서로 난수를 소비한다.
- 시각 효과는 별도 cosmetic seed 또는 비결정적 난수를 사용하되 상태 JSON과 판정에 영향을 주지 않는다.

### 입력과 시간 훅

- DOM 이벤트는 즉시 상태를 바꾸지 않고 다음 tick의 `InputFrame`에 축약된다.
- `InputFrame`은 이동 축, 조준 논리 좌표, fire/dash/interact의 `held`와 `pressed`를 갖는다.
- Playwright도 실제 DOM 입력을 통해 같은 queue를 사용한다. 테스트 전용 순간이동이나 직접 점수 변경 API는 만들지 않는다.
- 내부 테스트는 `advanceTicks(count, inputs)`를 사용한다.
- 공개 `window.advanceTime(ms)`는 automation accumulator에 ms를 더해 완성된 tick만 진행하고 소수 잔여를 보존한다. 0ms는 아무 변화가 없다.
- automation mode에서는 rAF가 시뮬레이션을 진행하지 않고 화면만 그린다. 실제 clock과 수동 clock이 동시에 상태를 바꾸는 일을 금지한다.

### 진단 출력

`render_game_to_text()`는 사람이 읽을 요약을 JSON으로 반환하며 다음을 최소 포함한다.

- schema version, mode, seed, tick, 좌표계
- 플레이어 체력·좌표·대시·무기 상태
- 패킷 운반/업로드 수, 탈출 가능 여부와 채널 진행
- 중계기별 ID·소켓·내구도·연결/교란/단절 상태
- 활성 적을 역할별 집계하고, 가까운 위협만 좌표와 함께 노출
- 같은 상태를 식별하는 canonical state hash

정확한 golden test에는 별도의 canonical serializer를 사용한다. 표시용 반올림이 state hash에 들어가면 안 된다.

## 6. 브라우저 하위 시스템

### 저장

- 저장 key: `signal-courier.save.v1`
- 값: `{ schemaVersion, settings, unlocks, contracts, aggregateStats }` JSON
- 시작 시 parse → schema 검사 → migration → default merge 순서로 읽는다.
- 설정 변경과 런 결과 확정 시에만 쓴다. 매 tick 동기식 `localStorage` write는 금지한다.
- `SecurityError`, `QuotaExceededError`, 손상 JSON을 처리하고 저장 불가 시 세션 플레이를 계속한다.
- 손상 값은 메모리에서 default로 대체하고 콘솔에 한 번만 진단한다. 사용자 데이터를 조용히 덮어쓰지 않는다.
- 런 중간 저장, 클라우드, IndexedDB는 MVP 제외다. 현재 메타 데이터는 수십 KB이므로 브라우저별 Web Storage 10MiB 한도보다 충분히 작다.

### 오디오

- `AudioContext` 하나와 `master`, `music`, `sfx` GainNode를 사용한다.
- 첫 `Enter` 또는 `pointerdown` 사용자 제스처 안에서 context를 만들거나 `resume()`해 autoplay 정책을 만족한다.
- 짧은 효과음은 `fetch` + `decodeAudioData`로 AudioBuffer에 미리 로드하고, 음악이 생기면 HTMLMediaElement streaming을 별도 검토한다.
- 한 순간 재생 voice를 16개로 제한하며 같은 효과의 중복은 짧은 cooldown으로 합친다.
- 시뮬레이션은 `shot`, `relay-online`, `packet-secured`, `extract-start` 같은 효과 이벤트만 낸다. 실제 재생 성공·실패는 게임 상태를 바꾸지 않는다.
- 원본은 WAV로 보관하고 런타임은 Ogg/Opus와 MP3 fallback을 manifest에 함께 둔다. 음소거와 master/sfx/music 볼륨을 저장한다.
- MVP 요구가 짧은 효과음과 한 루프 음악을 넘지 않으므로 Howler를 추가하지 않는다.

### 입력

- 물리 위치가 필요한 `event.key` 대신 `KeyboardEvent.code`를 기본 매핑으로 쓴다.
- 마우스는 `PointerEvent` 하나로 받고 CSS canvas rect와 내부 backbuffer 비율을 사용해 960×540 논리 좌표로 변환한다.
- pointer 좌표는 범위 안으로 clamp하고, primary pointer만 gameplay aim에 사용한다.
- Canvas가 focus된 동안만 Space/방향키 기본 동작을 막는다. `blur`와 `visibilitychange`에서 held input을 비우고 자동 일시정지한다.
- `F` 전체 화면과 `Escape` 종료는 실제 사용자 입력 handler 안에서 수행하고 기존 검증을 유지한다.
- 키 재매핑은 `Action` 이름과 여러 binding의 표로 저장한다. 시스템 코드는 물리 키를 직접 읽지 않는다.

### 에셋 파이프라인

- M1은 기존처럼 Canvas primitives를 사용해 gameplay 가설을 먼저 검증한다.
- 원본 제작 파일은 `assets-src/`, 런타임 산출물은 `src/assets/{sprites,audio}/`로 구분한다.
- 런타임 manifest module은 ID, Vite가 resolve한 import URL, 종류, 크기, 라이선스 ID를 가진다. 원격 CDN 에셋과 런타임 임의 URL은 금지한다.
- 런타임 에셋은 source import로 build graph에 포함시켜 누락을 빌드에서 잡고 hash 파일명을 얻는다. `public/`은 favicon처럼 이름을 그대로 유지해야 하는 파일만 두며 현재 `public/assets` 런타임 파일은 M1 에셋 도입 때 옮긴다.
- 벡터 원본은 게임 크기에 맞춘 PNG/WebP로 export하고, 반복 이미지는 시작 시 `createImageBitmap()`으로 decode·cache한다.
- 매 프레임 이미지 scale, 글꼴 변경, gradient 생성, shadowBlur 남발을 피한다. 반복 도형은 작은 offscreen canvas에 pre-render한다.
- 데이터 캐시·소켓·밸런스는 런타임 JSON보다 `src/game/content/*.ts`의 typed constant를 우선해 빌드 시 오류를 잡는다.
- 배포는 `base: "./"`을 사용한 정적 bundle을 목표로 하고 반드시 HTTP(S)로 제공한다. `dist/`와 테스트 artifact는 커밋하지 않는다.

## 7. 테스트 계층

| 계층 | 도구·환경 | 검증 대상 | 실행 시점 |
|---|---|---|---|
| L0 정적 검사 | TypeScript, Vite build | 타입, 미사용 코드, asset URL, production bundle | 모든 변경 |
| L1 순수 단위 | Vitest Node | RNG 재현, 이동·충돌, relay graph, director budget, 저장 migration | gameplay 변경 |
| L2 시뮬레이션 통합 | Vitest Node | seed+입력 명령으로 10분 런, 부분/완전/실패, canonical hash | gameplay 변경 |
| L3 브라우저 기능 | Playwright Chromium | 실제 키·pointer, fullscreen, audio unlock, localStorage, 상태 JSON, 콘솔 오류 | 모든 플레이 변경 |
| L4 시각 회귀 | Playwright screenshot + 직접 검토 | 메뉴, 교전, 교란 링크, 탈출 HUD, 결과 화면 | 렌더/UI 변경 |
| L5 호환성 | Playwright Firefox/WebKit smoke | 부팅, 첫 입력, 첫 중계기, 저장 round-trip | M2 이후 릴리스 후보 |
| L6 성능 | Chromium 실시간 stress scene + trace | frame p50/p95, simulation/render 시간, long task, heap 증가 | M2와 M3 종료 |

### 필수 단위·통합 시나리오

- 같은 seed와 tick별 입력이 10회 반복해 같은 canonical hash를 만든다.
- 0ms, 1 tick 미만, 여러 tick, 10분 경계의 `advanceTime`이 정확히 동작한다.
- 중계기 연결, 교란, 단절, 수리, 하위 링크 전파가 순서와 무관한지 확인한다.
- 두 번째 패킷은 부분 탈출을 열고 세 번째 패킷은 완전 탈출을 연다.
- 10:00 전에 8초 추출을 끝내지 못하면 실패한다.
- 잘못된 save schema, 오래된 version, quota/storage 비활성 상태에서 default로 안전하게 시작한다.
- blur/pause 동안 tick, input, audio effect가 누적되지 않는다.

Vitest은 browser mode를 추가하지 않는다. 순수 코어는 Node에서 빠르게 검증하고 실제 Web API는 이미 설치된 Playwright로 검증해 역할 중복을 피한다. coverage는 M2부터 systems/core의 line·branch 80%를 방향 지표로 사용하되 숫자 때문에 의미 없는 테스트를 만들지 않는다.

## 8. 성능·용량 예산

기준 장비는 4코어 노트북 CPU, 8GB RAM, Intel UHD 620급 내장 GPU, 최신 Chromium, 1280×720 viewport다.

| 항목 | 목표 | 실패 기준/대응 |
|---|---:|---|
| 화면 주기 | 60fps 목표, 실제 플레이 frame p95 ≤ 20ms | p95 초과 시 simulation/render 분리 계측 후 병목 제거 |
| simulation | tick p95 ≤ 2ms, 최악 ≤ 5ms | spatial grid 또는 query 축소 검토 |
| Canvas render | frame p95 ≤ 8ms | 정적 layer cache, offscreen pre-render, 상태 변경 batching |
| 활성 적 | 일반+엘리트 최대 150 | director가 spawn을 다음 파동으로 이월 |
| 활성 투사체 | 최대 250 | 수명·사거리 상한과 pool 적용 |
| 시각 파티클 | 최대 400 | 중요도 낮은 파티클부터 drop |
| Canvas backbuffer | DPR 최대 2, 최대 1920×1080 | 더 큰 DPR은 CSS scale만 사용 |
| 초기 JS/CSS | gzip 100KB 이하 | 런타임 의존성·중복 코드 감사 |
| 첫 화면 필수 asset | 압축 3MB 이하 | 음악·후반 asset 지연 load |
| 전체 MVP 다운로드 | 압축 10MB 이하 | 중복 해상도·무압축 audio 제거 |
| JS heap | warm-up 후 128MB 이하 | 10런 뒤 증가 10MB 초과 시 leak 조사 |
| long task | 정상 런에서 50ms 초과 0건 목표 | asset decode와 대량 생성 분할 |

성능 수치는 `advanceTime()`으로 빠르게 넘긴 테스트가 아니라 실제 rAF stress scene에서 잰다. 최적화 순서는 계측 → 할당 제거 → 화면 밖 skip → 반복 그림 cache → spatial index이며, 객체 풀과 worker/offscreen canvas는 profiler 근거가 있을 때만 도입한다.

## 9. 설치와 버전 정책

### 현재 유지

```text
Node.js        22.12+
vite           8.2.2
typescript     5.9.3
playwright     1.62.1
```

### M1에서 추가

```powershell
npm install --save-dev vitest@4.1.11
npx playwright install chromium
```

M2 릴리스 호환성 검증에서만 Firefox/WebKit browser binary를 추가한다.

```powershell
npx playwright install firefox webkit
```

추가할 script 목표는 다음과 같다.

```json
{
  "test:unit": "vitest run",
  "test:game": "node scripts/verify-game.mjs",
  "verify": "npm run check && npm run test:unit && npm run build && npm run test:game"
}
```

- 런타임 dependency는 0개를 유지한다.
- 직접 dependency의 정확한 설치 버전은 lockfile로 고정하고 CI는 `npm ci`만 사용한다.
- patch/minor 자동 갱신은 lockfile 검토와 전체 verify를 통과해야 한다.
- Vite, TypeScript, Playwright, Vitest의 major upgrade는 한 작업에 섞지 않는다.
- 배포물 또는 Credits에 직접 포함한 MIT/Apache-2.0 dependency notice와 에셋별 라이선스를 기록한다.

| 직접 도구 | 라이선스 | 배포 판단 |
|---|---|---|
| Vite | MIT | 개발·빌드 도구, notice 기록 |
| TypeScript | Apache-2.0 | 개발 도구, notice 기록 |
| Playwright | Apache-2.0 | 테스트 전용, 게임 bundle 미포함 |
| Vitest | MIT | 테스트 전용, 게임 bundle 미포함 |
| Canvas/Web Audio/Web Storage | 브라우저 표준 API | 별도 runtime package 없음 |

## 10. 전환 기준

### Canvas → PixiJS

다음 중 하나가 두 번의 프로파일링에서 재현될 때 1일 spike를 만든다.

- MDN 권장 cache·batch·integer coordinate 최적화 뒤에도 Canvas render p95가 8ms를 넘는다.
- 화면에 250개 이상 움직이는 sprite 또는 500개 이상 총 display object가 필요하다.
- atlas batching, 다중 카메라 zoom/rotation, 많은 mask/filter, GPU particle이 핵심 디자인 요구가 된다.
- 고해상도 sprite/text가 Canvas에서 품질 또는 메모리 예산을 지속적으로 넘긴다.

spike는 같은 seed와 입력으로 Canvas/Pixi renderer의 상태 hash가 같고, 시각 결과·bundle·frame budget이 개선되는지 증명해야 한다. `ports/renderer.ts` 아래만 교체하고 simulation, save, input command, 자동화 계약은 유지한다.

### Canvas → Phaser

다음 조건을 모두 만족할 때만 ADR로 검토한다.

- 두 번째 이상 맵과 장면 전환이 확정되고 tilemap/animation/physics 제작량이 M1의 3배 이상이다.
- 자체 camera, loader, animation, collision 중 최소 세 모듈을 Phaser가 실제로 제거한다.
- Phaser 4.x의 필요한 API가 stable하고 WebGL 전용 배포를 수용한다.
- 수동 clock, seeded RNG, `advanceTime`, text state를 보존한 spike가 Playwright 전체 흐름을 통과한다.

단지 “게임 엔진이 있으면 편할 것 같다”는 이유로 전환하지 않는다.

### Canvas → Godot

다음 제품 결정이 생기면 웹 구현을 이어 붙이지 말고 별도 포팅 계획을 세운다.

- 브라우저가 1차 플랫폼이 아니게 되고 Windows/macOS/Linux 또는 콘솔 export가 필수다.
- 비개발자가 에디터에서 다수 레벨·애니메이션을 지속 제작해야 한다.
- 복잡한 polygon physics, navigation, animation tree가 핵심이 된다.
- WASM 초기 용량, WebGL 2, hosting header, JS bridge 자동화 비용을 수용할 일정이 있다.

Godot 전환은 renderer 교체가 아니라 GDScript/scene/export로의 제품 포팅이다. MVP 도중에는 수행하지 않는다.

### 네이티브 Web API 보조 라이브러리

- 오디오 동시 재생·streaming·codec fallback 버그가 2개 이상 브라우저에서 반복될 때 Howler를 검토한다.
- 원/AABB만으로 해결할 수 없는 회전 polygon, continuous collision, joint가 gameplay 필수가 될 때 물리 엔진을 검토한다.
- 저장 상태가 1MiB를 넘거나 run resume/replay 다건 보관이 필요할 때 IndexedDB로 이동한다.

## 11. 구현 순서와 종료 게이트

1. **구조 보존 리팩터**: 현행 45초 게임을 core/adapter로 나누고 기존 상태·스크린샷을 유지한다.
2. **결정론 잠금**: clock, tick, seed RNG, input frame, canonical hash와 Vitest 회귀를 만든다.
3. **2분 코어**: 이동·전투·중계기 1개·패킷 1개를 같은 상태 흐름으로 구현한다.
4. **10분 런**: director, 세 패킷, 연결 단절, 부분/완전 탈출을 확장한다.
5. **브라우저 서비스**: 저장, 오디오, asset manifest, 접근성 설정을 연결한다.
6. **성능·호환성**: stress scene과 Chromium 필수, Firefox/WebKit smoke를 통과한다.

M1 종료 게이트는 “엔진을 설치했는가”가 아니라 다음 네 조건이다.

- 동일 seed+입력의 상태 hash가 반복 실행에서 같다.
- 실제 rAF와 `advanceTime`이 같은 step 함수를 사용한다.
- renderer/audio/storage를 제거한 Node 테스트에서 전체 규칙이 실행된다.
- `npm run check`, `npm run build`, Vitest, Playwright 입력·상태·스크린샷·콘솔 검사가 성공한다.

## 12. 공식 출처

모든 링크는 2026-08-30에 확인했다.

### Vite·테스트 도구

- Vite, [Getting Started](https://vite.dev/guide/) — Node 20.19+ 또는 22.12+, 개발 브라우저와 Vite 8의 modern browser 가정.
- Vite, [Building for Production](https://vite.dev/guide/build) — `dist/` 정적 배포, `base`, 기본 production target(Chrome/Edge 111, Firefox 114, Safari 16.4).
- Vite, [Static Asset Handling](https://vite.dev/guide/assets) — import asset과 `public/`의 차이, public 파일의 root 경로 규칙.
- Vite, [Vite 8 Announcement](https://vite.dev/blog/announcing-vite8) — Vite 8의 Rolldown 기반 빌드 전환.
- Vitest, [Getting Started](https://vitest.dev/guide/) — Vite-native TypeScript 테스트, Node 20+ 요구.
- Playwright, [Browsers](https://playwright.dev/docs/browsers) — Chromium, Firefox, WebKit 자동화.
- Playwright, [Evaluating JavaScript](https://playwright.dev/docs/evaluating) — 브라우저 context에서 진단 훅 호출.
- Playwright, [Screenshots](https://playwright.dev/docs/screenshots) — 실제 렌더 산출물 검증.

### Canvas·브라우저 API

- MDN, [Anatomy of a video game](https://developer.mozilla.org/en-US/docs/Games/Anatomy) — rAF와 update/render 분리, fixed tick 구조.
- MDN, [Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — offscreen pre-render, integer coordinate, 상태 변경 batching, rAF 사용.
- MDN, [Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — 사용자 제스처 안에서 AudioContext 생성·resume, 사용자 볼륨 제어.
- MDN, [Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — origin 단위 세션 간 지속.
- MDN, [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — Web Storage 총 10MiB 한도와 예외 처리.
- MDN, [PointerEvent](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent) — 마우스·펜·터치를 통합하는 pointer 입력.

### 비교 후보

- Phaser, [Phaser 4.2.1 Release](https://phaser.io/download/release/v4.2.1) — 최신 조사 버전과 npm 설치 경로.
- Phaser, [Phaser 4 Renderer](https://phaser.io/news/2026/04/phaser-4-renderer-faster-cleaner-and-built-for-modern-games) — 새 WebGL renderer, WebGL 2, Canvas renderer deprecation.
- Phaser, [TimeStep](https://docs.phaser.io/api-documentation/class/core-timestep) — rAF/timeout 기반 engine heartbeat와 background tab 중지 동작.
- Phaser, [Terms of Use](https://phaser.io/community/terms-of-use) — Phaser Framework의 MIT License.
- PixiJS, [Versions](https://pixijs.com/versions) — 공식 문서 안정판 버전.
- PixiJS, [Render Loop](https://pixijs.com/8.x/guides/concepts/render-loop) — ticker 정지·제어와 scene graph 렌더 흐름.
- PixiJS, [Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips) — sprite batching, culling, Graphics/Text/Mask 비용.
- PixiJS, [v8.16 Canvas renderer](https://pixijs.com/blog/8.16.0) — 실험적 Canvas fallback과 지원 범위.
- PixiJS, [GitHub repository](https://github.com/pixijs/pixijs) — TypeScript 코드베이스와 MIT License.
- Godot, [Godot 4.7.2 Release](https://godotengine.org/article/maintenance-release-godot-4-7-2/) — 최신 안정판 조사 버전.
- Godot, [Exporting for the Web](https://docs.godotengine.org/en/4.7/tutorials/export/exporting_for_web.html) — WebAssembly/WebGL 2, single-thread 기본, thread export의 cross-origin isolation, MIME·압축 요구.
- Godot, [Custom HTML page for Web export](https://docs.godotengine.org/en/4.7/tutorials/platform/web/customizing_html5_shell.html) — Canvas 선택, engine boot, custom page와 JavaScript 연동 지점.
- Godot, [License](https://godotengine.org/license/) — MIT License와 배포 고지 조건.

## 13. 최종 원칙

- 게임 규칙은 renderer와 브라우저에서 독립시킨다.
- 실제 플레이와 자동화는 동일 clock·input·step 경로를 쓴다.
- 새 라이브러리는 “직접 코드 몇 줄을 줄인다”가 아니라 검증된 병목이나 제작 요구를 제거할 때만 추가한다.
- Canvas 한계를 추측하지 않고 예산을 넘긴 trace로 증명한다.
- 엔진 전환 시에도 `render_game_to_text`, `advanceTime`, seed replay, 입력→중간 상태→결과의 검증 계약은 제품 요구로 유지한다.
