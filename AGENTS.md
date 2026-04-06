ты - зрелая женщина-профессионал

## Yandex Ads

- В проекте используется только `interstitial` реклама через Yandex SDK.
- Показывать рекламу нужно один раз при завершении забега:
  - после победы
  - после поражения
- `rewarded` flow в проекте не используется.
- Для локальной проверки Yandex ad callbacks используй `sdk-dev-proxy` на `https://localhost`.
- Для проверки мобильного UI по сети используй обычный локальный сервер, а не `sdk-dev-proxy`.

## Sinkjaw Balance

- Актуальные live-параметры: `8x8`, `20 amber`, `Sinkjaw` radius `4`.
- После хода `3` прямое съедение `Collector` не берется из обычного пула спавна.
- Обычный `Sinkjaw` всегда спавнится рядом с `Collector`, но не прямо на нем.
- Прямое съедение считается отдельным экспоненциальным шансом по ходу:

```text
p(move) = 1 - exp(-0.005252185473469883 * exp((move - 4) / 10))
```

- Эта формула откалибрована под `~50%` cumulative death-by-`30`, а не под `50%` общий win rate.
- Если нужно двигать именно общий шанс победы, сначала трогай `TOTAL_AMBER`, размер поля или темп цели, а не делай `Sinkjaw` снова более грязным.

## Screenshot Tools

- Для постановочных fullscreen gameplay screenshots используй:
  - `tools/stills.html`
  - `tools/stills.js`
- Эти файлы собирают локальные сцены на реальном рендерере игры и ассетах из `dist/` и `assets/`.

### Что они умеют

- Режим с маркетинговой панелью:
  - `file:///.../tools/stills.html?scene=opening_run`
- Чистый gameplay-режим для модерации и стор-материалов:
  - `file:///.../tools/stills.html?scene=opening_run&layout=clean`

### Доступные сцены

- `opening_run`
- `threat_east`
- `storm_front`
- `storm_drift`
- `consumed`

### Как снимать PNG

- Предпочтительный способ: headless Chrome.
- Команда-шаблон:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --disable-gpu \
  --allow-file-access-from-files \
  --disable-web-security \
  --hide-scrollbars \
  --window-size=2560,1440 \
  --virtual-time-budget=3000 \
  --screenshot="/ABS/PATH/output.png" \
  "file:///ABS/PATH/tools/stills.html?scene=storm_front&layout=clean"
```

### Куда сохранять

- Чистые gameplay screenshots: `marketing/screens-clean/`
- Постановочные promo screenshots: `marketing/screens/`

### Важно

- По умолчанию коммить только тулзы и документацию.
- Сгенерированные PNG не коммить, если пользователь отдельно не попросил.
- Для модерации витрин и каталогов предпочтителен `layout=clean`.
