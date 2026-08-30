# 게임 검증 규약

## 정적 검증

```bash
npm run check
npm run test:unit
npm run build
npm run test:build
```

먼저 프로덕션 빌드를 프리뷰하고 서버가 `http://127.0.0.1:4173`에서 응답하는지 확인한 뒤 전체 상태 전이를 검증한다. `test:game`은 서버 수명주기를 직접 관리하지 않는다.

```bash
npm run preview -- --host 127.0.0.1
# 다른 터미널에서
npm run test:game
```

다른 주소는 `GAME_URL` 환경 변수로 지정한다.

## 플레이 검증

개발 서버를 실행하고 Codex의 `develop-web-game` Playwright 클라이언트로 짧은 입력 버스트를 수행한다.

검증 순서:

1. 메뉴 스크린샷과 `mode=menu` 상태를 확인한다.
2. `Enter` 후 `mode=playing`을 확인한다.
3. 실제 키·pointer로 이동, 대시, 조준 사격, EMP의 입력→쿨다운/피해→결과를 확인한다.
4. 소켓에서 `E` 설치, 패킷 접촉 회수, 중계기에서 `E` 업로드를 2분 안에 완료한다.
5. 사수의 실제 탄환으로 링크가 정상→교란→단절되고 `E` 수리로 정상 복귀하는 흐름을 확인한다.
6. 일시정지 중 tick 정지, 재시작, 전체 화면 진입/종료, 0ms 무변경을 확인한다.
7. 960×540, 1280×720, 1920×1080과 reduced-motion 스크린샷을 직접 열어 잘림, 대비, 누락을 확인한다.
8. 화면의 링크 색·선 형태와 `render_game_to_text()`의 `linkState`가 일치하고 새 콘솔 오류가 없는지 확인한다.

산출물은 `artifacts/` 아래에 두고 Git에는 포함하지 않는다. 재현 명령과 핵심 관찰은 해당 작업 기록과 `progress.md`에 남긴다.

## M1 목표 계층

- L0: `npm run check`, `npm run build`
- L1/L2: Vitest로 순수 코어 단위·시뮬레이션 통합 검증
- L3: Playwright Chromium 실제 입력·브라우저 서비스 검증
- L4: 필수 장면 스크린샷과 직접 검토
- L5: M2 이후 Firefox/WebKit 릴리스 스모크
- L6: 실제 rAF stress scene 성능 측정

M1에서 Vitest를 추가한 뒤 `npm run test:unit`과 정적·브라우저 검증을 묶은 `npm run verify`를 만든다. 같은 seed와 tick 입력 10회가 같은 canonical hash를 만드는지, 0ms `advanceTime`이 상태를 바꾸지 않는지 필수로 확인한다.

현재 `scripts/verify-game.mjs`는 순간이동·점수 변경 API 없이 실제 DOM 입력만 사용한다. 대표 증거는 `artifacts/game-verification/`의 메뉴 3해상도, 온라인·교란·단절·수리, 운반 중 교전, 업로드 완료, reduced-motion 캡처다.

`test:build`는 생산 HTML의 자산 URL이 `base: "./"` 기준 상대 경로인지 확인하고, `dist/licenses/`의 CC0/OFL 원문·크레딧·에셋 manifest가 저장소 원본과 byte 단위로 일치하는지 검증한다.
