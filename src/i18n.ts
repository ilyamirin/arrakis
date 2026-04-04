import type { GameStatus, LossReason, TelegraphSector } from "./types.js";

export type Locale = "en" | "ru" | "tr";

export interface StaticCopy {
  htmlLang: Locale;
  title: string;
  metaDescription: string;
  ogDescription: string;
  twitterDescription: string;
  eyebrow: string;
  heroText: string;
  projectNote: string;
  restart: string;
  canvasLabel: string;
  stateKicker: string;
  initialStatusTitle: string;
  initialStatusMessage: string;
  amberLabel: string;
  movesLabel: string;
  positionLabel: string;
  legendCollectorTitle: string;
  legendCollectorText: string;
  legendSinkjawTitle: string;
  legendSinkjawText: string;
  legendAmberTitle: string;
  legendAmberText: string;
  legendSkimmerTitle: string;
  legendSkimmerText: string;
  legendStormTitle: string;
  legendStormText: string;
  rulesKicker: string;
  rulesTitle: string;
  rulesItems: string[];
  authorKicker: string;
  authorCopy: string;
  authorMeta: string;
  footerText: string;
  footerLicense: string;
}

const EN_COPY: StaticCopy = {
  htmlLang: "en",
  title: "Amber Dunes Harvest",
  metaDescription:
    "Amber Dunes Harvest is a retro-futurist desert game shaped with AI-generated code, art, music, copy, and interface. Guide the Collector across an 8x8 grid in the Amber Waste, gather every amber deposit, and stay ahead of Sinkjaw.",
  ogDescription:
    "A retro-futurist desert game by Ilya Mirin with AI-generated code, art, music, copy, and interface. Guide the Collector through the Amber Waste, gather amber, and outlast Sinkjaw on an 8x8 board.",
  twitterDescription:
    "A retro-futurist desert game with AI-generated code, art, music, copy, and interface: gather amber, move like a knight, and stay clear of Sinkjaw.",
  eyebrow: "Retro-Futurist Desert Game",
  heroText:
    "Strip the Amber Waste clean across an 8x8 grid. The Collector moves with a knight's stride, and Sinkjaw can break surface within four tiles after every move.",
  projectNote:
    "AI-generated code, art, music, copy, and interface. Sound effects use CC0 audio from OpenGameArt.",
  restart: "New Run",
  canvasLabel: "Amber Dunes Harvest game board",
  stateKicker: "Status",
  initialStatusTitle: "Expedition underway",
  initialStatusMessage: "Choose one of the lit squares.",
  amberLabel: "Amber",
  movesLabel: "Moves",
  positionLabel: "Position",
  legendCollectorTitle: "Collector",
  legendCollectorText: "Takes amber the moment it touches down.",
  legendSinkjawTitle: "Sinkjaw",
  legendSinkjawText: "Breaks surface within four tiles and closes a square to you.",
  legendAmberTitle: "Amber",
  legendAmberText: "To win, you must take all 20 deposits.",
  legendSkimmerTitle: "Skimmer",
  legendSkimmerText: "Carries the Collector to the legal square you choose.",
  legendStormTitle: "Storm front",
  legendStormText:
    "Drifts one square each turn. If you fly into it, the squall throws the Collector clear.",
  rulesKicker: "Rules",
  rulesTitle: "Field guide",
  rulesItems: [
    "The Collector moves in the knight's L-shaped stride.",
    "The lit marks show every legal landing square.",
    "The pilot marks Sinkjaw pressure directly on the field.",
    "Storm cells drift one square each turn and throw the Collector to a random clear square.",
    "For the first three moves, Sinkjaw cannot surface under the Collector.",
    "If Sinkjaw surfaces beneath the Collector, the run is lost.",
    "The moment the last amber deposit is taken, the field is yours.",
  ],
  authorKicker: "Author",
  authorCopy:
    "Staff LLM engineer building practical AI systems, sharper developer workflows, and tools meant to be shipped, not admired.",
  authorMeta:
    "Gameplay code, music, interface copy, and visual assets are AI-generated. Sound effects use CC0 audio from OpenGameArt.",
  footerText: "© 2026 Ilya Mirin. Released under the MIT License.",
  footerLicense: "View license",
};

const RU_COPY: StaticCopy = {
  htmlLang: "ru",
  title: "Amber Dunes Harvest",
  metaDescription:
    "Amber Dunes Harvest — ретрофутуристическая пустынная игра с AI-generated кодом, артом, музыкой, текстами и интерфейсом. Проведите Collector по сетке 8x8 через The Amber Waste, соберите весь amber и уклонитесь от ударов Sinkjaw.",
  ogDescription:
    "Ретрофутуристическая пустынная игра Ильи Мирина с AI-generated кодом, артом, музыкой, текстами и интерфейсом. Проведите Collector через The Amber Waste, соберите amber и переживите удары Sinkjaw на поле 8x8.",
  twitterDescription:
    "Ретрофутуристическая пустынная игра с AI-generated кодом, артом, музыкой, текстами и интерфейсом: собирайте amber, ходите как конь и уходите от Sinkjaw.",
  eyebrow: "Ретрофутуристическая пустынная игра",
  heroText:
    "Зачистите поле на сетке 8x8 в The Amber Waste. Collector ходит как конь, а Sinkjaw всплывает в радиусе четырёх клеток после каждого вашего хода.",
  projectNote:
    "Код, арт, музыка, тексты и интерфейс созданы с помощью AI. Звуковые эффекты CC0 — с OpenGameArt.",
  restart: "Новая экспедиция",
  canvasLabel: "Игровое поле Amber Dunes Harvest",
  stateKicker: "Статус",
  initialStatusTitle: "Экспедиция идёт",
  initialStatusMessage: "Выберите одну из подсвеченных клеток.",
  amberLabel: "Amber",
  movesLabel: "Ходы",
  positionLabel: "Позиция",
  legendCollectorTitle: "Collector",
  legendCollectorText: "Забирает amber сразу при приземлении.",
  legendSinkjawTitle: "Sinkjaw",
  legendSinkjawText: "Всплывает в пределах четырёх клеток и закрывает квадрат.",
  legendAmberTitle: "Amber",
  legendAmberText: "Чтобы победить, нужно собрать все 20 залежей.",
  legendSkimmerTitle: "Skimmer",
  legendSkimmerText: "Переносит Collector на выбранную допустимую клетку.",
  legendStormTitle: "Фронт бури",
  legendStormText:
    "Сдвигается на одну клетку за ход. Если войти в бурю, шквал выбросит Collector прочь.",
  rulesKicker: "Правила",
  rulesTitle: "Кратко",
  rulesItems: [
    "Collector ходит Г-образным прыжком, как шахматный конь.",
    "Подсвеченные отметки на поле показывают все допустимые клетки.",
    "Пилот показывает направление угрозы прямо на поле.",
    "Буря сдвигается на одну клетку за ход и выбрасывает Collector на случайную чистую клетку.",
    "Первые три хода Sinkjaw не может всплыть прямо под Collector.",
    "Если Sinkjaw всплывает под Collector, экспедиция окончена.",
    "Как только взята последняя залежь amber, поле ваше.",
  ],
  authorKicker: "Автор",
  authorCopy:
    "Staff LLM engineer. Делает практичные AI-системы, выстраивает developer workflows и доводит инструменты до рабочего релиза.",
  authorMeta:
    "Геймплейный код, музыка, интерфейсные тексты и визуальные ассеты созданы с помощью AI. Звуковые эффекты — CC0-аудио с OpenGameArt.",
  footerText: "© 2026 Ilya Mirin. Проект выпущен под лицензией MIT.",
  footerLicense: "Открыть лицензию",
};

const TR_COPY: StaticCopy = {
  htmlLang: "tr",
  title: "Amber Dunes Harvest",
  metaDescription:
    "Amber Dunes Harvest, yapay zekâyla üretilmiş kod, görseller, müzik, metinler ve arayüzle hazırlanmış retro-fütüristik bir çöl oyunudur. Collector'ı 8x8 tahtada Amber Waste boyunca yönlendirin, amber toplayın ve Sinkjaw saldırılarından kaçının.",
  ogDescription:
    "Ilya Mirin imzalı retro-fütüristik çöl oyunu. Yapay zekâyla üretilmiş kod, görseller, müzik, metinler ve arayüzle Amber Waste'te amber toplayın ve 8x8 tahtada Sinkjaw saldırılarından kurtulun.",
  twitterDescription:
    "Yapay zekâyla üretilmiş kod, görseller, müzik, metinler ve arayüze sahip retro-fütüristik bir çöl oyunu: amber topla, at gibi ilerle, Sinkjaw'dan kaç.",
  eyebrow: "Retro-Fütüristik Çöl Oyunu",
  heroText:
    "Amber Waste üzerindeki 8x8 sahayı temizleyin. Collector satrançtaki at gibi ilerler; her hamlenizin ardından Sinkjaw en fazla dört kare ötede yüzeye çıkar.",
  projectNote:
    "Kod, görseller, müzik, metinler ve arayüz yapay zekâyla üretildi. Ses efektleri ise OpenGameArt'tan alınan CC0 içeriklerdir.",
  restart: "Yeni Sefer",
  canvasLabel: "Amber Dunes Harvest oyun alanı",
  stateKicker: "Durum",
  initialStatusTitle: "Sefer sürüyor",
  initialStatusMessage: "Vurgulanan karelerden birini seçin.",
  amberLabel: "Amber",
  movesLabel: "Hamle",
  positionLabel: "Konum",
  legendCollectorTitle: "Collector",
  legendCollectorText: "Konar konmaz amber'ı toplar.",
  legendSinkjawTitle: "Sinkjaw",
  legendSinkjawText: "Dört kare içinde yüzeye çıkar ve bir kareyi kapatır.",
  legendAmberTitle: "Amber",
  legendAmberText: "Kazanmak için 20 yatağın hepsini toplamalısınız.",
  legendSkimmerTitle: "Skimmer",
  legendSkimmerText: "Collector'ı seçtiğiniz geçerli kareye taşır.",
  legendStormTitle: "Fırtına cephesi",
  legendStormText:
    "Her tur bir kare kayar. İçine inerseniz Collector'ı açık bir kareye savurur.",
  rulesKicker: "Kurallar",
  rulesTitle: "Kısaca",
  rulesItems: [
    "Collector, satrançtaki at gibi L şeklinde ilerler.",
    "Aydınlık işaretler geçerli iniş karelerini gösterir.",
    "Pilot, Sinkjaw baskısını doğrudan saha üzerinde gösterir.",
    "Fırtına her tur bir kare kayar ve Collector'ı rastgele boş bir kareye savurur.",
    "İlk üç hamlede Sinkjaw doğrudan Collector'ın altında beliremez.",
    "Sinkjaw Collector'ın altında yüzeye çıkarsa sefer biter.",
    "Son amber yatağı alındığında saha sizindir.",
  ],
  authorKicker: "Yazar",
  authorCopy:
    "Staff LLM engineer. Pratik AI sistemleri kurar, geliştirici iş akışlarını iyileştirir ve araçları kullanılır hâlde yayına alır.",
  authorMeta:
    "Oynanış kodu, müzik, arayüz metinleri ve görsel varlıklar yapay zekâyla üretildi. Ses efektleri OpenGameArt'tan alınan CC0 varlıklardır.",
  footerText: "© 2026 Ilya Mirin. Proje MIT lisansı ile yayımlanmıştır.",
  footerLicense: "Lisansı aç",
};

export function normalizeLocale(rawLocale?: string | null): Locale {
  const normalized = rawLocale?.toLowerCase() ?? "";
  if (normalized.startsWith("ru")) {
    return "ru";
  }
  if (normalized.startsWith("tr")) {
    return "tr";
  }
  return "en";
}

export function getStaticCopy(locale: Locale): StaticCopy {
  switch (locale) {
    case "ru":
      return RU_COPY;
    case "tr":
      return TR_COPY;
    default:
      return EN_COPY;
  }
}

export function statusTitleCopy(
  locale: Locale,
  status: GameStatus,
  lossReason: LossReason,
): string {
  if (status === "won") {
    if (locale === "ru") return "Поле зачищено";
    if (locale === "tr") return "Saha temiz";
    return "Field secured";
  }
  if (status === "lost") {
    if (lossReason === "sinkjaw_attack") {
      if (locale === "ru") return "Collector потерян";
      if (locale === "tr") return "Collector kaybedildi";
      return "Collector lost";
    }
    if (locale === "ru") return "Выхода нет";
    if (locale === "tr") return "Yol kapandı";
    return "No way through";
  }
  if (locale === "ru") return "Экспедиция идёт";
  if (locale === "tr") return "Sefer sürüyor";
  return "Expedition underway";
}

export function flightTitleCopy(
  locale: Locale,
  phase: "storm-approach" | "storm-drift" | "flight",
): string {
  if (phase === "storm-approach") {
    if (locale === "ru") return "Фронт бури";
    if (locale === "tr") return "Fırtına cephesi";
    return "Storm front";
  }
  if (phase === "storm-drift") {
    if (locale === "ru") return "Снос ветром";
    if (locale === "tr") return "Rüzgâr sürüklemesi";
    return "Wind shear";
  }
  if (locale === "ru") return "Skimmer в пути";
  if (locale === "tr") return "Skimmer yolda";
  return "Skimmer inbound";
}

export function flightMessageCopy(
  locale: Locale,
  phase: "storm-approach" | "storm-drift" | "flight",
  sector: string,
): string {
  if (phase === "storm-approach") {
    if (locale === "ru") return `Skimmer входит в бурю у сектора ${sector}.`;
    if (locale === "tr") return `Skimmer, ${sector} sektöründeki fırtınaya giriyor.`;
    return `The Skimmer cuts into the squall at sector ${sector}.`;
  }
  if (phase === "storm-drift") {
    if (locale === "ru") return `Шквал тащит Skimmer к сектору ${sector}.`;
    if (locale === "tr") return `Fırtına Skimmer'ı ${sector} sektörüne sürüklüyor.`;
    return `The squall catches the Skimmer and drags it toward sector ${sector}.`;
  }
  if (locale === "ru") return `Skimmer идёт к сектору ${sector}.`;
  if (locale === "tr") return `Skimmer ${sector} sektörüne ilerliyor.`;
  return `The Skimmer bears the Collector toward sector ${sector}.`;
}

export function gameMessageCopy(
  locale: Locale,
  key:
    | "initial"
    | "cheat_victory"
    | "invalid_move"
    | "storm_trapped"
    | "amber_taken"
    | "amber_waiting"
    | "empty_cell"
    | "run_complete"
    | "no_moves"
    | "sinkjaw_attack",
  params: { moves?: number } = {},
): string {
  switch (key) {
    case "initial":
      if (locale === "ru") return "Выберите одну из подсвеченных клеток и начните экспедицию.";
      if (locale === "tr") return "Vurgulanan karelerden birini seçip sefere başlayın.";
      return "Choose one of the lit squares and begin the crossing.";
    case "cheat_victory":
      if (locale === "ru") return "Скрытый сигнал прорезал пустошь. Collector выведен, линия ваша.";
      if (locale === "tr") return "Gizli bir sinyal çölü yardı. Collector kurtuldu; amber hattı artık sizin.";
      return "A hidden signal cut across the Waste. The Collector is clear, and the amber line is yours.";
    case "invalid_move":
      if (locale === "ru") return "Так ходить нельзя. Выберите одну из подсвеченных клеток.";
      if (locale === "tr") return "Bu hamle geçersiz. Vurgulanan karelerden birini seçin.";
      return "That jump will not hold. Take one of the lit squares.";
    case "storm_trapped":
      if (locale === "ru") return "Буря сомкнулась, но выбросить Collector уже было некуда.";
      if (locale === "tr") return "Fırtına kapandı ama Collector'ı savuracak boş kare kalmadı.";
      return "The storm closed around the Collector, but there was nowhere left to cast it.";
    case "amber_taken":
      if (locale === "ru") return "Amber взят. Sinkjaw наверняка почувствовал дрожь.";
      if (locale === "tr") return "Amber alındı. Sinkjaw sarsıntıyı hissetmiş olmalı.";
      return "Amber taken. Sinkjaw will have felt the tremor.";
    case "amber_waiting":
      if (locale === "ru") return " Там уже лежал amber.";
      if (locale === "tr") return " Orada zaten amber vardı.";
      return " Amber was waiting there.";
    case "empty_cell":
      if (locale === "ru") return "Пустая клетка. Держите темп.";
      if (locale === "tr") return "Boş kare. Tempoyu koruyun.";
      return "A barren stretch of Waste. Keep the expedition moving.";
    case "run_complete":
      if (locale === "ru") return `Экспедиция завершена за ${params.moves ?? 0} ходов. Поле очищено.`;
      if (locale === "tr") return `Sefer ${params.moves ?? 0} hamlede tamamlandı. Saha temiz.`;
      return `Expedition complete in ${params.moves ?? 0} moves. The field is stripped clean.`;
    case "no_moves":
      if (locale === "ru") return "Ходов больше нет. Collector зажат.";
      if (locale === "tr") return "Hamle kalmadı. Collector sıkıştı.";
      return "No jumps remain. The Collector has been boxed in.";
    case "sinkjaw_attack":
      if (locale === "ru") return "Sinkjaw всплыл прямо под Collector. Экспедиция окончена.";
      if (locale === "tr") return "Sinkjaw tam Collector'ın altında yüzeye çıktı. Sefer bitti.";
      return "Sinkjaw broke surface beneath the Collector. The expedition is over.";
  }
}

export function stormDriftMessageCopy(locale: Locale, sector: string): string {
  if (locale === "ru") return `Шквал выбросил Collector в сектор ${sector}.`;
  if (locale === "tr") return `Fırtına Collector'ı ${sector} sektörüne savurdu.`;
  return `The squall flung the Collector clear to sector ${sector}.`;
}

export function sinkjawSightedCopy(locale: Locale, sector: string): string {
  if (locale === "ru") return `Sinkjaw замечен в секторе ${sector}.`;
  if (locale === "tr") return `Sinkjaw ${sector} sektöründe görüldü.`;
  return `Sinkjaw sighted in sector ${sector}.`;
}

export function pilotLineCopy(locale: Locale, sector: TelegraphSector, sectorName: string): string {
  if (sector === "obscured") {
    if (locale === "ru") return "Пилот: буря глушит сигнал. Прогноз сорван.";
    if (locale === "tr") return "Pilot: Fırtına sinyali bozuyor. Okuma yok.";
    return "Pilot: Storm interference. The read is gone.";
  }

  if (locale === "ru") {
    switch (sector) {
      case "north":
        return `Пилот: садимся в ${sectorName}. Угроза к северу.`;
      case "northeast":
        return `Пилот: садимся в ${sectorName}. Смотрите на северо-восток.`;
      case "east":
        return `Пилот: садимся в ${sectorName}. Угроза к востоку.`;
      case "southeast":
        return `Пилот: садимся в ${sectorName}. Жар держится на юго-востоке.`;
      case "south":
        return `Пилот: садимся в ${sectorName}. Угроза к югу.`;
      case "southwest":
        return `Пилот: садимся в ${sectorName}. Держите юго-запад под глазом.`;
      case "west":
        return `Пилот: садимся в ${sectorName}. Угроза к западу.`;
      case "northwest":
        return `Пилот: садимся в ${sectorName}. Северо-запад становится опасным.`;
      default:
        return `Пилот: садимся в ${sectorName}. Безопасной стороны нет.`;
    }
  }

  if (locale === "tr") {
    switch (sector) {
      case "north":
        return `Pilot: ${sectorName} karesine in. Tehlike kuzeyde.`;
      case "northeast":
        return `Pilot: ${sectorName} karesine in. Tehlike kuzeydoğuda.`;
      case "east":
        return `Pilot: ${sectorName} karesine in. Tehlike doğuda.`;
      case "southeast":
        return `Pilot: ${sectorName} karesine in. Tehlike güneydoğuda.`;
      case "south":
        return `Pilot: ${sectorName} karesine in. Tehlike güneyde.`;
      case "southwest":
        return `Pilot: ${sectorName} karesine in. Tehlike güneybatıda.`;
      case "west":
        return `Pilot: ${sectorName} karesine in. Tehlike batıda.`;
      case "northwest":
        return `Pilot: ${sectorName} karesine in. Tehlike kuzeybatıda.`;
      default:
        return `Pilot: ${sectorName} karesine in. Güvenli yön yok.`;
    }
  }

  switch (sector) {
    case "north":
      return `Pilot: Put down at ${sectorName}. Threat north.`;
    case "northeast":
      return `Pilot: Put down at ${sectorName}. Threat northeast.`;
    case "east":
      return `Pilot: Put down at ${sectorName}. Threat east.`;
    case "southeast":
      return `Pilot: Put down at ${sectorName}. Threat southeast.`;
    case "south":
      return `Pilot: Put down at ${sectorName}. Threat south.`;
    case "southwest":
      return `Pilot: Put down at ${sectorName}. Threat southwest.`;
    case "west":
      return `Pilot: Put down at ${sectorName}. Threat west.`;
    case "northwest":
      return `Pilot: Put down at ${sectorName}. Threat northwest.`;
    default:
      return `Pilot: Put down at ${sectorName}. No safe side.`;
  }
}

export function telegraphKickerCopy(locale: Locale): string {
  if (locale === "ru") return "ЧТЕНИЕ ДРОЖИ";
  if (locale === "tr") return "SARSINTI OKUMASI";
  return "TREMOR READ";
}

export function telegraphCaptionCopy(locale: Locale, sector: TelegraphSector): string {
  if (locale === "ru") {
    switch (sector) {
      case "north":
        return "УГРОЗА НА СЕВЕРЕ";
      case "northeast":
        return "УГРОЗА СВ";
      case "east":
        return "УГРОЗА НА ВОСТОКЕ";
      case "southeast":
        return "УГРОЗА ЮВ";
      case "south":
        return "УГРОЗА НА ЮГЕ";
      case "southwest":
        return "УГРОЗА ЮЗ";
      case "west":
        return "УГРОЗА НА ЗАПАДЕ";
      case "northwest":
        return "УГРОЗА СЗ";
      case "obscured":
        return "ПРОГНОЗ СОРВАН";
      default:
        return "КРУГОМ ОПАСНО";
    }
  }

  if (locale === "tr") {
    switch (sector) {
      case "north":
        return "TEHLİKE KUZEYDE";
      case "northeast":
        return "TEHLİKE KD";
      case "east":
        return "TEHLİKE DOĞUDA";
      case "southeast":
        return "TEHLİKE GD";
      case "south":
        return "TEHLİKE GÜNEYDE";
      case "southwest":
        return "TEHLİKE GB";
      case "west":
        return "TEHLİKE BATIDA";
      case "northwest":
        return "TEHLİKE KB";
      case "obscured":
        return "OKUMA YOK";
      default:
        return "HER YAN TEHLİKELİ";
    }
  }

  switch (sector) {
    case "north":
      return "THREAT NORTH";
    case "northeast":
      return "THREAT NE";
    case "east":
      return "THREAT EAST";
    case "southeast":
      return "THREAT SE";
    case "south":
      return "THREAT SOUTH";
    case "southwest":
      return "THREAT SW";
    case "west":
      return "THREAT WEST";
    case "northwest":
      return "THREAT NW";
    case "obscured":
      return "READ LOST";
    default:
      return "NO SAFE SIDE";
  }
}

export function overlayTitleCopy(
  locale: Locale,
  status: GameStatus,
  lossReason: LossReason,
): string {
  if (status === "won") {
    if (locale === "ru") return "ПОЛЕ ЗАЧИЩЕНО";
    if (locale === "tr") return "SAHA TEMİZ";
    return "FIELD SECURED";
  }
  if (lossReason === "sinkjaw_attack") {
    if (locale === "ru") return "COLLECTOR ПОТЕРЯН";
    if (locale === "tr") return "COLLECTOR KAYIP";
    return "COLLECTOR LOST";
  }
  if (locale === "ru") return "УДАР SINKJAW";
  if (locale === "tr") return "SINKJAW SALDIRISI";
  return "SINKJAW STRIKE";
}

export function overlayBodyCopy(
  locale: Locale,
  status: GameStatus,
  lossReason: LossReason,
): string {
  if (status === "won") {
    if (locale === "ru") {
      return "Skimmer успел вытащить Collector. Нажмите «Новая экспедиция» и выходите в поле снова.";
    }
    if (locale === "tr") {
      return 'Skimmer, Collector\'ı son anda çekip aldı. "Yeni Sefer" ile yeniden sahaya çıkın.';
    }
    return "The Skimmer hauled the Collector clear. Press New Run and cut another line across the Amber Waste.";
  }
  if (lossReason === "sinkjaw_attack") {
    if (locale === "ru") {
      return "Sinkjaw забрал Collector. Нажмите «Новая экспедиция» и отправьте новый экипаж.";
    }
    if (locale === "tr") {
      return 'Sinkjaw Collector\'ı aldı. "Yeni Sefer" ile yeni bir ekip gönderin.';
    }
    return "Sinkjaw took the Collector. Press New Run and send another expedition.";
  }
  if (locale === "ru") {
    return "Нажмите «Новая экспедиция», чтобы выйти в поле снова.";
  }
  if (locale === "tr") {
    return '"Yeni Sefer" ile sahaya yeniden çıkın.';
  }
  return "Press New Run to head back into the field.";
}
