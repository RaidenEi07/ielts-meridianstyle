// Sinh giao diện từ 3 màu thương hiệu (chủ đạo, nhấn, nền) mà admin chọn ở Cấu hình hệ thống.
//
// Vì sao không chỉ đổi 3 biến CSS: chữ trắng trên nút chủ đạo, chữ liên kết màu nhấn và chữ thường
// đều cần đủ độ tương phản trên nền mới. Nếu admin chọn màu quá nhạt hoặc nền tối mà giữ nguyên các
// màu còn lại thì giao diện không đọc được — kể cả chính trang Cấu hình, nơi cần bấm để sửa lại. Nên
// module này chỉnh độ sáng (giữ nguyên sắc độ) tới khi đạt chuẩn WCAG AA rồi mới xuất CSS.
//
// Kết quả là các biến `--brand-*`; globals.css đọc chúng qua var(--brand-*, <màu mặc định chỉnh tay>),
// nên khi cả 3 màu đều là mặc định thì không sinh CSS gì và giao diện giữ nguyên như cũ.
// Module thuần (không React/DOM) để dùng được ở server (layout.tsx) lẫn trình duyệt (xem thử).
import { parseColorInput } from "./color";

export interface BrandColors {
  primary: string;
  accent: string;
  background: string;
}

export const BRAND_DEFAULTS: Readonly<BrandColors> = {
  primary: "#1E3A5F",
  accent: "#C2691D",
  background: "#FBF8F3",
};

/** Tên token (bỏ tiền tố `--brand-`) → giá trị màu. */
export type TokenMap = Record<string, string>;

export interface BrandTheme {
  /** CSS đầy đủ (`:root{…}.dark{…}`) để nhét vào <style>. */
  css: string;
  /** Những chỗ hệ thống phải chỉnh lại màu admin chọn, viết sẵn cho người đọc. */
  notes: string[];
  /** Nền tối: cả bản "sáng" lẫn "tối" đều dùng tông tối, nút Sáng/Tối của người dùng không đổi được gì. */
  alwaysDark: boolean;
  /** Bảng màu áp cho `:root` (chưa bật chế độ tối). */
  light: TokenMap;
  /** Bảng màu áp cho `.dark`. */
  dark: TokenMap;
}

// ---------------------------------------------------------------------------------------------
// Toán màu (sRGB, độ sáng tương đối và tỉ lệ tương phản theo WCAG 2.x)
// ---------------------------------------------------------------------------------------------

type Rgb = [number, number, number];
type Hsl = [number, number, number];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: readonly number[]): string {
  const channels = rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"));
  return `#${channels.join("").toUpperCase()}`;
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function rgbToHsl([r255, g255, b255]: Rgb): Hsl {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb([h, s, l]: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const hslToHex = (h: number, s: number, l: number) => rgbToHex(hslToRgb([h, s, l]));

/** Trộn `a` sang `b` theo tỉ lệ t (0 = giữ nguyên a). */
function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

/**
 * Đổi độ sáng HSL của `hex` (giữ sắc độ và độ bão hòa) tới khi luminance nằm trong [min, max].
 * Luminance tăng theo độ sáng HSL nên tìm nhị phân, và kiểm trên chính giá trị đã làm tròn RGB
 * để kết quả thật sự thỏa điều kiện chứ không chỉ "gần thỏa".
 */
function fitLuminance(hex: string, min: number, max: number): string {
  const lum = luminance(hex);
  if (lum >= min && lum <= max) return hex;
  const [h, s, l0] = rgbToHsl(hexToRgb(hex));
  const at = (l: number) => hslToHex(h, s, l);
  if (lum > max) {
    let ok = 0;
    let bad = l0;
    for (let i = 0; i < 24; i++) {
      const mid = (ok + bad) / 2;
      if (luminance(at(mid)) <= max) ok = mid;
      else bad = mid;
    }
    return at(ok);
  }
  let bad = l0;
  let ok = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (ok + bad) / 2;
    if (luminance(at(mid)) >= min) ok = mid;
    else bad = mid;
  }
  return at(ok);
}

/**
 * Đẩy `fg` về phía đậm hơn (dir = -1) hoặc nhạt hơn (dir = +1) cho tới khi tương phản với MỌI màu
 * trong `against` đạt `min`. Không đạt nổi thì trả về đầu mút (đen/trắng) — tốt nhất có thể.
 */
function nudge(fg: string, against: string[], min: number, dir: 1 | -1): string {
  const ok = (c: string) => against.every((b) => contrastRatio(c, b) >= min);
  if (ok(fg)) return fg;
  const [h, s, l0] = rgbToHsl(hexToRgb(fg));
  const at = (l: number) => hslToHex(h, s, l);
  const end = dir === 1 ? 1 : 0;
  if (!ok(at(end))) return at(end);
  let bad = l0;
  let good = end;
  for (let i = 0; i < 24; i++) {
    const mid = (bad + good) / 2;
    if (ok(at(mid))) good = mid;
    else bad = mid;
  }
  return at(good);
}

// ---------------------------------------------------------------------------------------------
// Ngưỡng thiết kế
// ---------------------------------------------------------------------------------------------

const TEXT_AA = 4.5; // chữ thường, chữ liên kết
const TEXT_AAA = 7; // chữ chính trên nền
const UI_MIN = 3; // chữ to/đậm trên nút, chữ mờ, placeholder
const EPS = 1e-4;

/** Luminance lớn nhất để chữ trắng vẫn đạt tỉ lệ `ratio` trên màu đó. */
const whiteMaxLuminance = (ratio: number) => 1.05 / ratio - 0.05;

// Nền sáng nhất quán: chữ đen phải đạt ≥ 7:1 kể cả trên màu "nền nhạt" (đậm hơn nền 5%). Nền sáng vừa
// (xám trung tính) thì không có màu chữ nào đủ đọc, nên kéo sáng lên tới ngưỡng này.
const LIGHT_BG_MIN_LUM = 0.34;
// Nền tối: nút (chữ trắng, cần ≤ 0.30) và chữ liên kết trên nền (cần ≥ ~0.28) chỉ cùng đạt khi nền
// đủ tối. Nền tối hơn ngưỡng này (như #0F172A, #121212) giữ nguyên, sáng hơn thì làm đậm.
const DARK_BG_MAX_LUM = 0.01;
// Ranh giới chọn tông: dưới ngưỡng này coi là nền tối (gần trung điểm độ sáng cảm nhận giữa 2 cực).
const BG_SPLIT_LUM = 0.1;

// ---------------------------------------------------------------------------------------------
// Màu chỉnh tay hiện có trong globals.css
// ---------------------------------------------------------------------------------------------

const HAND_TUNED = {
  light: { primary: "#1E3A5F", accent: "#C2691D", green: "#1E6F43", red: "#9B2C2C", info: "#0E7490" },
  dark: { primary: "#5B8FD6", accent: "#E8923A", green: "#5BBE86", red: "#E08585", info: "#38BDF8" },
} as const;

const SERIES_DARK = [
  "#3987E5",
  "#D95926",
  "#199E70",
  "#C98500",
  "#D55181",
  "#008300",
  "#9085E9",
  "#E66767",
];

/** "Nền" mà chữ thương hiệu nằm lên: dùng để tính độ sáng cho phép và để trộn ra màu nhạt (soft). */
interface Ground {
  dark: boolean;
  surface: string;
  /** Mọi nền chữ có thể nằm trên (bg, surface, card, soft). */
  surfaces: string[];
}

const HAND_TUNED_GROUND: Record<"light" | "dark", Ground> = {
  light: { dark: false, surface: "#FFFFFF", surfaces: ["#FBF8F3", "#FFFFFF", "#FBF8F3", "#F4EEE4"] },
  dark: { dark: true, surface: "#1E1A15", surfaces: ["#16130F", "#1E1A15", "#211C16", "#262019"] },
};

// ---------------------------------------------------------------------------------------------
// Bộ nền: từ 1 màu nền sinh ra surface/card/soft/border và 3 bậc chữ
// ---------------------------------------------------------------------------------------------

interface Neutrals {
  dark: boolean;
  bg: string;
  surface: string;
  card: string;
  soft: string;
  border: string;
  text: string;
  muted: string;
  faint: string;
}

function lightNeutrals(base: string, hue: number, sat: number): Neutrals {
  const surface = mix(base, "#FFFFFF", 0.8);
  const soft = mix(base, "#000000", 0.05);
  const border = mix(base, "#000000", 0.1);
  const text = nudge(hslToHex(hue, Math.min(sat, 0.25), 0.12), [base, soft], TEXT_AAA, -1);
  const muted = nudge(mix(text, base, 0.42), [base, soft], TEXT_AA, -1);
  const faint = nudge(mix(text, base, 0.62), [base], UI_MIN, -1);
  return { dark: false, bg: base, surface, card: base, soft, border, text, muted, faint };
}

function darkNeutrals(base: string, hue: number, sat: number): Neutrals {
  const surface = mix(base, "#FFFFFF", 0.04);
  const card = mix(base, "#FFFFFF", 0.055);
  const soft = mix(base, "#FFFFFF", 0.075);
  const border = mix(base, "#FFFFFF", 0.14);
  const text = nudge(hslToHex(hue, Math.min(sat, 0.2), 0.92), [base, soft], TEXT_AAA, 1);
  const muted = nudge(mix(text, base, 0.42), [base, soft], TEXT_AA, 1);
  const faint = nudge(mix(text, base, 0.62), [base], UI_MIN, 1);
  return { dark: true, bg: base, surface, card, soft, border, text, muted, faint };
}

interface BackgroundResult {
  light: Neutrals;
  dark: Neutrals;
  /** Màu nền thực dùng sau khi chỉnh (bằng màu admin chọn nếu không phải chỉnh). */
  effective: string;
  alwaysDark: boolean;
}

function neutralsForBackground(background: string): BackgroundResult {
  const [hue, sat] = rgbToHsl(hexToRgb(background));
  if (luminance(background) >= BG_SPLIT_LUM) {
    const base = fitLuminance(background, LIGHT_BG_MIN_LUM, 1);
    // Chế độ tối của nền sáng: cùng sắc độ nhưng rất tối, giảm bão hòa để không lòe.
    const darkBase = hslToHex(hue, Math.min(sat, 0.3), 0.07);
    return {
      light: lightNeutrals(base, hue, sat),
      dark: darkNeutrals(darkBase, hue, Math.min(sat, 0.3)),
      effective: base,
      alwaysDark: false,
    };
  }
  const base = fitLuminance(background, 0, DARK_BG_MAX_LUM);
  const dark = darkNeutrals(base, hue, sat);
  return { light: dark, dark, effective: base, alwaysDark: true };
}

// ---------------------------------------------------------------------------------------------
// Màu thương hiệu: khớp độ sáng để cả nút (chữ trắng) lẫn chữ liên kết đều đọc được
// ---------------------------------------------------------------------------------------------

function groundOf(n: Neutrals): Ground {
  return { dark: n.dark, surface: n.surface, surfaces: [n.bg, n.surface, n.card, n.soft] };
}

/** Màu chỉ dùng làm chữ (xanh/đỏ báo trạng thái): chỉ cần đọc được (AA) trên mọi nền của `ground`. */
function fitText(hex: string, ground: Ground): string {
  const lums = ground.surfaces.map(luminance);
  if (ground.dark) return fitLuminance(hex, TEXT_AA * (Math.max(...lums) + 0.05) - 0.05 + EPS, 1);
  return fitLuminance(hex, 0, (Math.min(...lums) + 0.05) / TEXT_AA - 0.05 - EPS);
}

/** Màu nhạt của một màu thương hiệu (nền ô đang chọn, huy hiệu): trộn vào nền khung. */
const softOf = (color: string, ground: Ground) => mix(ground.surface, color, ground.dark ? 0.16 : 0.1);

/** Tương phản tối thiểu cần đạt: `link` cho chữ màu trên nền, `fill` cho chữ trắng trên nút. */
interface Targets {
  link: number;
  fill: number;
}

const strictTargets = (ground: Ground): Targets => ({ link: TEXT_AA, fill: ground.dark ? UI_MIN : TEXT_AA });

/**
 * Màu mặc định chưa được admin đổi thì không nên bị đụng tới chỉ vì họ đổi nền. Nên chỉ đòi nó đọc được
 * ít nhất như hiện nay (trên nền chỉnh tay của cùng tông), chứ không đòi đủ AA — màu nhấn mặc định
 * #C2691D vốn chỉ đạt ~3.9:1 và sẽ bị sẫm đi nếu đòi 4.5:1.
 */
function baselineTargets(source: string, strict: Targets, original: Ground): Targets {
  return {
    link: Math.min(strict.link, ...original.surfaces.map((s) => contrastRatio(source, s))),
    fill: Math.min(strict.fill, contrastRatio("#FFFFFF", source)),
  };
}

/** Làm đậm `hex` (giữ sắc độ) tới khi `ok` thỏa; `ok` phải đơn điệu: càng đậm càng dễ thỏa. */
function darkenUntil(hex: string, ok: (candidate: string) => boolean): string {
  if (ok(hex)) return hex;
  const [h, s, l0] = rgbToHsl(hexToRgb(hex));
  const at = (l: number) => hslToHex(h, s, l);
  let good = 0;
  let bad = l0;
  for (let i = 0; i < 24; i++) {
    const mid = (good + bad) / 2;
    if (ok(at(mid))) good = mid;
    else bad = mid;
  }
  return at(good);
}

/** Màu vừa làm nền nút (chữ trắng) vừa làm chữ liên kết: chủ đạo và nhấn. */
function fitBrand(hex: string, ground: Ground, targets: Targets): string {
  const lums = ground.surfaces.map(luminance);
  if (!ground.dark) {
    const edge = Math.min(...lums);
    const max = Math.min((edge + 0.05) / targets.link - 0.05, whiteMaxLuminance(targets.fill)) - EPS;
    const color = fitLuminance(hex, 0, Math.max(0, max));
    // Chữ còn nằm trên màu nhạt của chính nó (huy hiệu, ô đang chọn), tối hơn nền khung một chút.
    return darkenUntil(color, (c) => contrastRatio(c, softOf(c, ground)) >= targets.link);
  }
  const edge = Math.max(...lums);
  const min = targets.link * (edge + 0.05) - 0.05 + EPS;
  const max = whiteMaxLuminance(targets.fill) - EPS;
  if (min <= max) return fitLuminance(hex, min, max);
  // Nền tối quá sáng nên hai điều kiện không cùng thỏa: chia đều phần thiếu cho cả hai.
  const target = Math.sqrt(1.05 * (edge + 0.05) * (targets.link / targets.fill)) - 0.05;
  return fitLuminance(hex, target, target);
}

/** Đổi màu nhẹ hơn mắt phân biệt được thì không đáng báo cho admin. */
function noticeablyDifferent(a: string, b: string): boolean {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return ca.some((v, i) => Math.abs(v - cb[i]) > 6);
}

// ---------------------------------------------------------------------------------------------
// Ghép thành bảng biến
// ---------------------------------------------------------------------------------------------

const NEUTRAL_KEYS = ["bg", "surface", "card", "soft", "border", "text", "muted", "faint"] as const;

function neutralTokens(n: Neutrals): TokenMap {
  const out: TokenMap = {};
  for (const key of NEUTRAL_KEYS) out[key] = n[key];
  return out;
}

/** Xanh/đỏ/thông tin giữ tông đã chỉnh tay của từng chế độ, chỉ chỉnh độ sáng nếu nền mới làm chúng khó đọc. */
function semanticTokens(ground: Ground): TokenMap {
  const src = ground.dark ? HAND_TUNED.dark : HAND_TUNED.light;
  const green = fitText(src.green, ground);
  const red = fitText(src.red, ground);
  const out: TokenMap = {
    green,
    "green-soft": softOf(green, ground),
    red,
    "red-soft": softOf(red, ground),
    info: fitText(src.info, ground),
  };
  if (ground.dark) SERIES_DARK.forEach((color, i) => (out[`series-${i + 1}`] = color));
  return out;
}

const ALL_VARS = [
  ...NEUTRAL_KEYS,
  "primary",
  "primary-soft",
  "accent",
  "accent-soft",
  "green",
  "green-soft",
  "red",
  "red-soft",
  "info",
  ...SERIES_DARK.map((_, i) => `series-${i + 1}`),
  "footer-bg",
  "footer-text",
];

/** Đưa mọi `--brand-*` về "chưa đặt" để var() rơi về màu mặc định — dùng cho bản xem thử, ghi đè bản đã lưu. */
const RESET_CSS = `:root,.dark{${ALL_VARS.map((v) => `--brand-${v}:initial`).join(";")}}`;

function block(selector: string, tokens: TokenMap, extra = ""): string {
  const body = Object.entries(tokens)
    .map(([name, value]) => `--brand-${name}:${value}`)
    .join(";");
  return `${selector}{${body}${extra}}`;
}

/** Chân trang: tông rất tối của màu chủ đạo, chữ sáng cùng sắc độ. Chỉ có khi admin đổi màu chủ đạo. */
function footerTokens(primary: string): TokenMap {
  const [hue, sat] = rgbToHsl(hexToRgb(primary));
  const bg = hslToHex(hue, Math.min(sat, 0.45), 0.09);
  return { "footer-bg": bg, "footer-text": nudge(hslToHex(hue, Math.min(sat, 0.2), 0.78), [bg], TEXT_AAA, 1) };
}

const pick = (hex: string, fallback: string) => parseColorInput(hex) ?? fallback;

/** Đọc 3 màu từ cấu hình công khai; ô nào thiếu hoặc sai thì dùng màu mặc định. */
export function brandColorsFromConfig(config: Record<string, string | undefined>): BrandColors {
  return {
    primary: pick(config.PRIMARY_COLOR ?? "", BRAND_DEFAULTS.primary),
    accent: pick(config.ACCENT_COLOR ?? "", BRAND_DEFAULTS.accent),
    background: pick(config.BACKGROUND_COLOR ?? "", BRAND_DEFAULTS.background),
  };
}

/**
 * Sinh bảng màu cho 3 màu đã chọn. Trả về null khi cả 3 là màu mặc định — khi đó giao diện dùng đúng
 * bảng màu chỉnh tay trong globals.css, không thay đổi gì.
 */
export function deriveBrandTheme(input: BrandColors): BrandTheme | null {
  const colors: BrandColors = {
    primary: pick(input.primary, BRAND_DEFAULTS.primary),
    accent: pick(input.accent, BRAND_DEFAULTS.accent),
    background: pick(input.background, BRAND_DEFAULTS.background),
  };
  const customPrimary = colors.primary !== BRAND_DEFAULTS.primary;
  const customAccent = colors.accent !== BRAND_DEFAULTS.accent;
  const customBackground = colors.background !== BRAND_DEFAULTS.background;
  if (!customPrimary && !customAccent && !customBackground) return null;

  const notes: string[] = [];
  const light: TokenMap = {};
  const dark: TokenMap = {};
  let lightGround = HAND_TUNED_GROUND.light;
  let darkGround = HAND_TUNED_GROUND.dark;
  let alwaysDark = false;

  if (customBackground) {
    const bg = neutralsForBackground(colors.background);
    alwaysDark = bg.alwaysDark;
    lightGround = groundOf(bg.light);
    darkGround = groundOf(bg.dark);
    Object.assign(light, neutralTokens(bg.light), semanticTokens(lightGround));
    Object.assign(dark, neutralTokens(bg.dark), semanticTokens(darkGround));
    if (bg.effective !== colors.background) {
      const darker = luminance(bg.effective) < luminance(colors.background);
      notes.push(
        `Màu nền ${colors.background} được ${darker ? "làm đậm" : "làm sáng"} thành ${bg.effective} ` +
          `để chữ và nút đọc rõ trên nền.`,
      );
    }
    if (bg.alwaysDark) {
      notes.push("Nền tối: giao diện luôn dùng tông tối, nút Sáng/Tối của người dùng không đổi được gì.");
    }
  }

  const brands = [
    { key: "primary", label: "Màu chủ đạo", custom: customPrimary },
    { key: "accent", label: "Màu nhấn", custom: customAccent },
  ] as const;
  for (const { key, label, custom } of brands) {
    if (!custom && !customBackground) continue;
    // Màu mặc định chưa đổi thì xuất phát từ bản chỉnh tay của đúng tông (nền tối → bản sáng hơn).
    const lightTone = lightGround.dark ? "dark" : "light";
    const lightSource = custom ? colors[key] : HAND_TUNED[lightTone][key];
    const darkSource = custom ? colors[key] : HAND_TUNED.dark[key];
    const lightTargets = custom
      ? strictTargets(lightGround)
      : baselineTargets(lightSource, strictTargets(lightGround), HAND_TUNED_GROUND[lightTone]);
    const darkTargets = custom
      ? strictTargets(darkGround)
      : baselineTargets(darkSource, strictTargets(darkGround), HAND_TUNED_GROUND.dark);
    const lightColor = fitBrand(lightSource, lightGround, lightTargets);
    const darkColor = fitBrand(darkSource, darkGround, darkTargets);
    light[key] = lightColor;
    light[`${key}-soft`] = softOf(lightColor, lightGround);
    dark[key] = darkColor;
    dark[`${key}-soft`] = softOf(darkColor, darkGround);
    if (noticeablyDifferent(lightColor, lightSource)) {
      const darker = luminance(lightColor) < luminance(lightSource);
      notes.push(
        `${label} ${lightSource} được ${darker ? "làm đậm" : "làm sáng"} thành ${lightColor} ` +
          `để chữ trắng trên nút và chữ liên kết đọc rõ.`,
      );
    }
  }

  if (customPrimary) Object.assign(light, footerTokens(colors.primary));

  const scheme = customBackground ? ";color-scheme:dark" : "";
  const css =
    block(":root", light, alwaysDark ? scheme : "") +
    // .dark đứng sau :root (cùng độ ưu tiên) nên thắng khi có class dark.
    block(".dark", dark, scheme);
  return { css, notes, alwaysDark, light, dark };
}

/** CSS cho <style>; rỗng khi cả 3 màu là mặc định. `reset` để bản xem thử ghi đè hẳn bản đã lưu. */
export function brandThemeCss(colors: BrandColors, options: { reset?: boolean } = {}): string {
  return (options.reset ? RESET_CSS : "") + (deriveBrandTheme(colors)?.css ?? "");
}
