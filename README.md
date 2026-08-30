# SIGNAL COURIER: LAST RELAY

중계기를 설치하고 패킷을 업로드하는 싱글 플레이 2D 탑다운 액션 게임입니다. 데스크톱 브라우저에서 키보드와 마우스로 플레이합니다.

<p align="center">
  <a href="docs/media/signal-courier-gameplay.mp4">
    <img src="docs/media/signal-courier-gameplay-preview.gif" width="960" alt="SIGNAL COURIER: LAST RELAY의 세 구역 전투와 네트워크 복구 플레이 영상">
  </a>
</p>

<p align="center">
  <strong>플레이 영상 58초 · 소리 포함</strong>
</p>

## 게임 방식

각 구역에서 중계기를 설치한 뒤 패킷을 가져와 업로드하면 다음 구역으로 넘어갑니다. 건물은 플레이어와 적, 양쪽의 총알을 막습니다.

1. 소켓에서 `E`를 눌러 중계기를 설치합니다.
2. 맵 반대편에 있는 패킷을 회수합니다.
3. 중계기로 돌아와 `E`를 눌러 업로드합니다.

현재 구역은 3개입니다. 2구역부터는 일정 수의 적을 처리해야 업로드할 수 있고, 구역마다 제한 시간이 줄어듭니다.

## 실행

Node.js 20.19+ 또는 22.12+와 최신 Chromium 계열 브라우저가 필요합니다.

```bash
npm ci
npm run dev
```

터미널에 표시된 주소를 열고 `Enter`를 누르면 시작합니다.

## 조작

| 입력 | 동작 |
|---|---|
| `WASD` / 방향키 | 이동 |
| 마우스 이동 / 왼쪽 버튼 | 조준 / 사격 |
| `Space` | 대시 |
| 마우스 오른쪽 버튼 | EMP |
| `E` 길게 누르기 | 중계기 설치·수리·패킷 업로드 |
| `Enter` | 시작·다음 구역 |
| `P` | 일시정지 |
| `R` | 전체 런 재시작 |
| `F` / `Escape` | 전체 화면 전환 / 종료 |

## 현재 빌드

현재 빌드는 3개 구역을 끝까지 플레이할 수 있는 데스크톱 웹 프로토타입입니다. 전투에는 과열식 사격, 대시와 EMP를 사용합니다. 구역 진행 상태와 남은 시간, 점수는 화면 상단에서 확인할 수 있습니다.

전체 검증은 `npm run verify`로 실행할 수 있습니다.

관련 문서: [게임 브리프](docs/game/GAME-BRIEF.md) · [조작](docs/game/CONTROLS.md) · [아키텍처](docs/game/ARCHITECTURE.md) · [Credits](docs/licenses/CREDITS.md)
