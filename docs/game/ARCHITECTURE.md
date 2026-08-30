# 게임 아키텍처

## 기준선

- Vite 8 + TypeScript + 브라우저 Canvas 2D
- 단일 진입점: `index.html` → `src/main.ts`
- 논리 해상도: 960 × 540
- 정적 에셋: `public/assets/`에서 루트 상대 경로 `/assets/...`로 참조
- 현재 수직 조각은 의존성 경계를 만들기 전 하나의 파일로 유지한다.

## 자동화 계약

모든 플레이 가능 빌드는 다음 전역 함수를 유지한다.

```ts
window.render_game_to_text(): string
window.advanceTime(milliseconds: number): void
```

`render_game_to_text`는 좌표계, 모드, 플레이어, 현재 상호작용 대상, 점수, 타이머를 JSON으로 반환한다. `advanceTime`은 60Hz 고정 스텝으로 상태를 진행하고 즉시 다시 그린다.

## 분리 신호

다음 중 하나가 발생할 때만 `src/game/` 모듈 분리를 시작한다.

- 두 번째 플레이 상태 또는 레벨이 추가된다.
- 동일한 엔티티 동작이 두 종류 이상에서 재사용된다.
- `main.ts`의 한 책임을 독립적으로 테스트할 실익이 생긴다.

구조를 먼저 확장하지 않고 실제 변경 압력이 생길 때 ADR과 함께 분리한다.

