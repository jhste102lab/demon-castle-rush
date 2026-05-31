# Demon Castle Rush / 마왕성 러시

기본 안내 언어는 한국어입니다. English notes are included below.

플레이: https://jhste102lab.github.io/demon-castle-rush/

## 한국어

**마왕성 러시**는 특이점이 온다 마이너 갤러리의 게임 제작/플레이 대회 참여용으로 만든 웹 게임입니다.

대회 글: https://gall.dcinside.com/mgallery/board/view/?id=thesingularity&no=1219923

이 프로젝트의 핵심 구현은 `goal.md`에 담긴 단일 일괄 지시문을 기준으로 만들었습니다. 해당 프롬프트는 GPT Pro 5.5 extended thinking 환경에서 다듬은 뒤, 게임 전체 요구사항을 한 번에 전달하는 형태로 구성했습니다.

소스 코드와 포함된 에셋은 MIT 라이선스로 공개합니다. 누구나 이 저장소를 가져가서 수정, 개조, 재배포, 상업적 이용을 할 수 있습니다. 자세한 조건은 `LICENSE`를 확인하세요.

### 게임

- 120초 침공 사이클이 끝없이 이어지는 자동 전투 생존 점수 게임입니다.
- 모바일과 PC 브라우저에서 세로형 한 화면으로 플레이합니다.
- 용사들이 위에서 침입하고, 마왕성 시설들이 자동으로 공격합니다.
- 업그레이드, 건설, 위험 보상, 스킬 변형 선택지는 직접 고르거나 제한 시간이 지나면 자동 선택됩니다.
- 2배속/3배속 버튼은 전투, 스폰, 성장, 선택 타이머에 함께 적용됩니다.
- 로그인, 백엔드, 광고, 결제, 온라인 랭킹, 외부 이미지, 외부 폰트, CDN 에셋은 사용하지 않습니다.

## English

**Demon Castle Rush** is a browser game entry made for the Singularity Gallery game-making/play event on DCInside.

Event post: https://gall.dcinside.com/mgallery/board/view/?id=thesingularity&no=1219923

The core implementation was built from the single batch instruction stored in `goal.md`. The prompt was refined with GPT Pro 5.5 extended thinking and then used as a one-shot game specification.

The source code and included assets are released under the MIT License. You may copy, modify, remix, redistribute, and use this project commercially. See `LICENSE` for the full terms.

### Game

- Infinite auto-battle survival score game with 120-second invasion cycles.
- Runs in a single vertical screen on mobile and desktop browsers.
- Castle facilities attack automatically while heroes push from the top of the field.
- Upgrade, construction, risk-reward, and skill-modifier choices can be selected manually or auto-picked when the timer expires.
- 2x and 3x speed controls affect combat, spawning, growth, and choice timers.
- No login, backend, ads, payments, online ranking, external images, external fonts, CDN assets, or audio files.

## Development

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm test
npm run build
npm run preview
npm run test:e2e
```

The Playwright suite runs against the production preview server and checks both mobile and desktop layouts.

## Environment Variables

This version does not require runtime environment variables. The source currently has no `import.meta.env`, `process.env`, or `VITE_*` app configuration references.

Local `.env` files are intentionally ignored. If future features add `VITE_*` variables, load them locally from the NovelTrack Infisical environment and configure matching GitHub Actions secrets for public deployment. Do not commit `.env` files.

## Deployment

The project is deployed to GitHub Pages from `.github/workflows/deploy.yml`.

On every push to `main`, GitHub Actions installs dependencies, runs unit tests, builds the Vite app, uploads `dist`, and deploys it to GitHub Pages.

## Original Goal

`goal.md` is the original Korean one-shot implementation prompt used to define the game requirements. It is kept in the repository as project context and a checklist for future changes; it is not required to run the game.

## License

MIT License. See `LICENSE`.
