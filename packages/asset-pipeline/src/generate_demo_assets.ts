import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SpriteDefinition {
  name: string;
  width: number;
  height: number;
  draw: (png: PNG, offsetX: number, offsetY: number) => void;
}

interface FrameData {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

function setPixel(png: PNG, x: number, y: number, r: number, g: number, b: number, a = 255) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  // Alpha blend
  if (a === 255 || png.data[idx + 3] === 0) {
    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
  } else {
    const alpha = a / 255;
    const invAlpha = 1 - alpha;
    png.data[idx] = Math.round(r * alpha + png.data[idx] * invAlpha);
    png.data[idx + 1] = Math.round(g * alpha + png.data[idx + 1] * invAlpha);
    png.data[idx + 2] = Math.round(b * alpha + png.data[idx + 2] * invAlpha);
    png.data[idx + 3] = Math.min(255, png.data[idx + 3] + a);
  }
}

function fillRect(png: PNG, x: number, y: number, w: number, h: number, r: number, g: number, b: number, a = 255) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      setPixel(png, px, py, r, g, b, a);
    }
  }
}

// 2:1 Isometric diamond helper
function fillIsoTile(png: PNG, cx: number, cy: number, halfW: number, halfH: number, r: number, g: number, b: number) {
  for (let dy = -halfH; dy <= halfH; dy++) {
    const span = Math.round((1 - Math.abs(dy) / halfH) * halfW);
    for (let dx = -span; dx <= span; dx++) {
      setPixel(png, cx + dx, cy + dy, r, g, b, 255);
    }
  }
}

export const sprites: SpriteDefinition[] = [
  // 1. Floor Tatami (64x32)
  {
    name: "floor_tatami",
    width: 64,
    height: 32,
    draw: (png, ox, oy) => {
      // Main mat body
      fillIsoTile(png, ox + 32, oy + 16, 30, 14, 218, 196, 145);
      // Dark border on edges
      for (let i = 0; i <= 30; i++) {
        setPixel(png, ox + 32 - i, oy + 16 - Math.round(i / 2), 70, 52, 35);
        setPixel(png, ox + 32 + i, oy + 16 - Math.round(i / 2), 70, 52, 35);
        setPixel(png, ox + 32 - i, oy + 16 + Math.round(i / 2), 45, 33, 22);
        setPixel(png, ox + 32 + i, oy + 16 + Math.round(i / 2), 45, 33, 22);
      }
      // Woven lines
      for (let y = oy + 8; y < oy + 24; y += 3) {
        setPixel(png, ox + 28, y, 190, 170, 120);
        setPixel(png, ox + 36, y, 190, 170, 120);
      }
    }
  },

  // 2. Floor Dark Wood (64x32)
  {
    name: "floor_wood",
    width: 64,
    height: 32,
    draw: (png, ox, oy) => {
      fillIsoTile(png, ox + 32, oy + 16, 30, 14, 110, 75, 45);
      // Plank seams
      for (let i = -20; i <= 20; i += 10) {
        setPixel(png, ox + 32 + i, oy + 16 + Math.round(i / 4), 78, 50, 30);
      }
      // Highlight rim
      for (let i = 0; i <= 30; i++) {
        setPixel(png, ox + 32 - i, oy + 16 - Math.round(i / 2), 140, 95, 60);
      }
    }
  },

  // 3. Floor Onsen Stone Tile (64x32)
  {
    name: "floor_onsen",
    width: 64,
    height: 32,
    draw: (png, ox, oy) => {
      fillIsoTile(png, ox + 32, oy + 16, 30, 14, 85, 95, 105);
      // Wet stone speckles
      for (let i = 0; i < 20; i++) {
        const rx = ox + 16 + ((i * 17) % 32);
        const ry = oy + 8 + ((i * 13) % 16);
        setPixel(png, rx, ry, 130, 150, 165);
      }
    }
  },

  // 4. Massage Bed Wood (64x48) - Station
  {
    name: "massage_bed_wood",
    width: 64,
    height: 48,
    draw: (png, ox, oy) => {
      // Wood frame base
      fillRect(png, ox + 18, oy + 24, 28, 14, 100, 65, 38);
      fillRect(png, ox + 16, oy + 36, 4, 10, 70, 42, 22); // leg
      fillRect(png, ox + 44, oy + 36, 4, 10, 70, 42, 22); // leg
      fillRect(png, ox + 30, oy + 38, 4, 8, 55, 32, 18);  // center leg
      // Soft cream padded mattress
      fillRect(png, ox + 16, oy + 18, 32, 8, 245, 240, 230);
      fillRect(png, ox + 14, oy + 20, 36, 6, 235, 228, 215);
      // Headrest ring & folded rolled towel
      fillRect(png, ox + 16, oy + 14, 8, 5, 210, 225, 220);
      fillRect(png, ox + 18, oy + 15, 4, 3, 100, 65, 38); // breathing hole
      // Folded bamboo green towel blanket on foot
      fillRect(png, ox + 38, oy + 19, 11, 7, 105, 145, 110);
      fillRect(png, ox + 40, oy + 18, 7, 2, 135, 175, 140);
    }
  },

  // 5. Onsen Tub with Steaming Water (64x64)
  {
    name: "onsen_tub",
    width: 64,
    height: 64,
    draw: (png, ox, oy) => {
      // Round wooden cedar tub rim
      for (let y = -14; y <= 14; y++) {
        for (let x = -24; x <= 24; x++) {
          const dist = (x * x) / (24 * 24) + (y * y) / (14 * 14);
          if (dist <= 1.0) {
            // Tub wall outer
            setPixel(png, ox + 32 + x, oy + 36 + y, 140, 95, 55);
          }
        }
      }
      // Tub height depth
      fillRect(png, ox + 8, oy + 36, 48, 14, 115, 75, 40);
      // Black iron bands around cedar tub
      fillRect(png, ox + 8, oy + 40, 48, 2, 40, 40, 45);
      fillRect(png, ox + 8, oy + 46, 48, 2, 40, 40, 45);
      // Inner steaming mineral water
      for (let y = -11; y <= 11; y++) {
        for (let x = -20; x <= 20; x++) {
          const dist = (x * x) / (20 * 20) + (y * y) / (11 * 11);
          if (dist <= 1.0) {
            setPixel(png, ox + 32 + x, oy + 35 + y, 70, 160, 190);
          }
        }
      }
      // Water highlight ripples
      setPixel(png, ox + 26, oy + 33, 150, 220, 240);
      setPixel(png, ox + 27, oy + 33, 150, 220, 240);
      setPixel(png, ox + 36, oy + 36, 150, 220, 240);
      setPixel(png, ox + 37, oy + 36, 150, 220, 240);
      // Small bamboo water spout on top edge
      fillRect(png, ox + 18, oy + 18, 6, 14, 120, 155, 90);
      fillRect(png, ox + 22, oy + 30, 4, 3, 80, 115, 60);
    }
  },

  // 6. Reception Desk (64x48)
  {
    name: "reception_desk",
    width: 64,
    height: 48,
    draw: (png, ox, oy) => {
      // Counter top
      fillIsoTile(png, ox + 32, oy + 20, 26, 10, 150, 105, 65);
      // Counter front panel
      fillRect(png, ox + 8, oy + 26, 48, 16, 110, 70, 40);
      // Tatami-style front latticework
      for (let px = ox + 14; px < ox + 52; px += 6) {
        fillRect(png, px, oy + 27, 2, 14, 75, 45, 25);
      }
      // Paper ledger / check-in tablet
      fillRect(png, ox + 22, oy + 16, 8, 6, 240, 240, 245);
      fillRect(png, ox + 24, oy + 18, 4, 3, 60, 60, 70);
      // Traditional red lantern hanging on right corner
      fillRect(png, ox + 46, oy + 10, 8, 12, 220, 50, 40);
      fillRect(png, ox + 48, oy + 8, 4, 2, 40, 40, 40);
      fillRect(png, ox + 48, oy + 22, 4, 3, 240, 180, 50); // tassel
    }
  },

  // 7. Lounge Sofa (64x48)
  {
    name: "sofa_armchair",
    width: 64,
    height: 48,
    draw: (png, ox, oy) => {
      // Wood frame bottom
      fillRect(png, ox + 12, oy + 30, 40, 8, 90, 60, 35);
      fillRect(png, ox + 14, oy + 38, 4, 6, 60, 38, 20);
      fillRect(png, ox + 46, oy + 38, 4, 6, 60, 38, 20);
      // Backrest cushions (deep sage green / olive)
      fillRect(png, ox + 14, oy + 12, 36, 14, 90, 120, 95);
      // Soft seat cushion
      fillRect(png, ox + 12, oy + 24, 40, 8, 120, 155, 125);
      // Wooden armrests
      fillRect(png, ox + 10, oy + 20, 4, 12, 110, 75, 45);
      fillRect(png, ox + 50, oy + 20, 4, 12, 110, 75, 45);
      // Cream throw pillow
      fillRect(png, ox + 16, oy + 20, 8, 8, 235, 230, 215);
    }
  },

  // 8. Tea Table (48x40)
  {
    name: "tea_table",
    width: 48,
    height: 40,
    draw: (png, ox, oy) => {
      fillIsoTile(png, ox + 24, oy + 18, 18, 8, 130, 85, 50);
      fillRect(png, ox + 8, oy + 24, 32, 6, 95, 60, 35);
      fillRect(png, ox + 10, oy + 30, 3, 6, 65, 40, 20);
      fillRect(png, ox + 35, oy + 30, 3, 6, 65, 40, 20);
      // Black cast-iron teapot (Tetsubin)
      fillRect(png, ox + 21, oy + 12, 6, 6, 45, 45, 50);
      setPixel(png, ox + 20, oy + 14, 45, 45, 50); // spout
      fillRect(png, ox + 22, oy + 10, 4, 2, 70, 70, 75); // handle
      // Green tea cups
      fillRect(png, ox + 29, oy + 14, 4, 4, 215, 230, 210);
      setPixel(png, ox + 30, oy + 15, 110, 155, 80); // matcha green tea inside
    }
  },

  // 9. Bamboo Plant in Ceramic Pot (32x56)
  {
    name: "bamboo_plant",
    width: 32,
    height: 56,
    draw: (png, ox, oy) => {
      // Ceramic pot
      fillRect(png, ox + 8, oy + 38, 16, 14, 230, 225, 215);
      fillRect(png, ox + 7, oy + 36, 18, 3, 180, 170, 160);
      // Bamboo stalks
      fillRect(png, ox + 11, oy + 10, 3, 28, 115, 160, 80);
      fillRect(png, ox + 17, oy + 6, 3, 32, 130, 175, 90);
      // Bamboo nodes
      fillRect(png, ox + 11, oy + 18, 3, 1, 75, 110, 50);
      fillRect(png, ox + 11, oy + 28, 3, 1, 75, 110, 50);
      fillRect(png, ox + 17, oy + 16, 3, 1, 85, 120, 60);
      fillRect(png, ox + 17, oy + 26, 3, 1, 85, 120, 60);
      // Leaves
      fillRect(png, ox + 6, oy + 12, 5, 2, 95, 145, 65);
      fillRect(png, ox + 20, oy + 8, 6, 2, 95, 145, 65);
      fillRect(png, ox + 19, oy + 18, 5, 2, 110, 160, 75);
    }
  },

  // 10. Chest / Cashbox (48x40)
  {
    name: "cash_chest",
    width: 48,
    height: 40,
    draw: (png, ox, oy) => {
      // Solid lacquered wooden chest body
      fillRect(png, ox + 10, oy + 18, 28, 16, 130, 70, 35);
      // Curved lid
      fillRect(png, ox + 8, oy + 12, 32, 7, 160, 90, 45);
      // Brass straps
      fillRect(png, ox + 14, oy + 12, 3, 22, 225, 180, 45);
      fillRect(png, ox + 31, oy + 12, 3, 22, 225, 180, 45);
      // Golden keyhole / lock
      fillRect(png, ox + 22, oy + 17, 4, 5, 245, 205, 55);
      setPixel(png, ox + 23, oy + 19, 40, 30, 10);
    }
  },

  // 11. Fallback Generic Wellness Booth (as requested in Section 5.1!)
  {
    name: "wellness_booth_generic",
    width: 64,
    height: 56,
    draw: (png, ox, oy) => {
      // Wooden booth frame
      fillRect(png, ox + 12, oy + 16, 40, 34, 135, 95, 55);
      fillRect(png, ox + 16, oy + 22, 32, 26, 95, 65, 35);
      // Glass door tint
      fillRect(png, ox + 18, oy + 24, 28, 22, 160, 210, 230, 180);
      // Snowflake icon on glass
      fillRect(png, ox + 31, oy + 30, 2, 10, 255, 255, 255);
      fillRect(png, ox + 27, oy + 34, 10, 2, 255, 255, 255);
      setPixel(png, ox + 29, oy + 32, 255, 255, 255);
      setPixel(png, ox + 34, oy + 32, 255, 255, 255);
      setPixel(png, ox + 29, oy + 37, 255, 255, 255);
      setPixel(png, ox + 34, oy + 37, 255, 255, 255);
    }
  },

  // 12. Staff Master Character (32x48)
  {
    name: "staff_master",
    width: 32,
    height: 48,
    draw: (png, ox, oy) => {
      // Head / hair bun
      fillRect(png, ox + 12, oy + 10, 8, 8, 250, 215, 185); // face skin
      fillRect(png, ox + 11, oy + 8, 10, 4, 40, 30, 25);   // black hair
      fillRect(png, ox + 14, oy + 5, 4, 4, 40, 30, 25);    // zen hair bun
      // Eyes
      setPixel(png, ox + 14, oy + 13, 50, 35, 25);
      setPixel(png, ox + 17, oy + 13, 50, 35, 25);
      // Zen uniform / tunic (Clean dark navy / charcoal with sash)
      fillRect(png, ox + 10, oy + 18, 12, 16, 45, 55, 75);
      fillRect(png, ox + 10, oy + 26, 12, 3, 210, 180, 130); // cream sash
      // Arms
      fillRect(png, ox + 7, oy + 19, 3, 10, 45, 55, 75);
      fillRect(png, ox + 22, oy + 19, 3, 10, 45, 55, 75);
      fillRect(png, ox + 7, oy + 29, 3, 3, 250, 215, 185); // hands
      fillRect(png, ox + 22, oy + 29, 3, 3, 250, 215, 185);
      // Trousers & sandals
      fillRect(png, ox + 11, oy + 34, 4, 10, 35, 42, 58);
      fillRect(png, ox + 17, oy + 34, 4, 10, 35, 42, 58);
      fillRect(png, ox + 10, oy + 44, 5, 2, 190, 160, 120);
      fillRect(png, ox + 17, oy + 44, 5, 2, 190, 160, 120);
    }
  },

  // 13. Guest Character (32x48)
  {
    name: "guest_avatar",
    width: 32,
    height: 48,
    draw: (png, ox, oy) => {
      // Head
      fillRect(png, ox + 12, oy + 12, 8, 8, 255, 220, 190);
      fillRect(png, ox + 11, oy + 10, 10, 3, 60, 45, 35);
      setPixel(png, ox + 14, oy + 15, 50, 35, 25);
      setPixel(png, ox + 17, oy + 15, 50, 35, 25);
      // Spa yukata / robe (warm sandy cream with subtle pattern)
      fillRect(png, ox + 9, oy + 20, 14, 18, 240, 235, 220);
      fillRect(png, ox + 9, oy + 27, 14, 3, 160, 80, 70); // red obi belt
      // Legs / slippers
      fillRect(png, ox + 11, oy + 38, 4, 6, 240, 235, 220);
      fillRect(png, ox + 17, oy + 38, 4, 6, 240, 235, 220);
    }
  },

  // 14. Particle: Steam (16x16)
  {
    name: "particle_steam",
    width: 16,
    height: 16,
    draw: (png, ox, oy) => {
      fillRect(png, ox + 4, oy + 4, 8, 8, 240, 245, 255, 170);
      fillRect(png, ox + 6, oy + 2, 4, 12, 255, 255, 255, 200);
      fillRect(png, ox + 2, oy + 6, 12, 4, 255, 255, 255, 200);
    }
  },

  // 15. Particle: Coin (16x16)
  {
    name: "particle_coin",
    width: 16,
    height: 16,
    draw: (png, ox, oy) => {
      // Golden circle
      fillRect(png, ox + 4, oy + 2, 8, 12, 255, 200, 40);
      fillRect(png, ox + 2, oy + 4, 12, 8, 255, 200, 40);
      fillRect(png, ox + 4, oy + 4, 8, 8, 255, 225, 80);
      // Inner star / shine
      fillRect(png, ox + 6, oy + 6, 4, 4, 255, 250, 160);
      fillRect(png, ox + 5, oy + 5, 2, 2, 255, 255, 255);
    }
  },

  // 16. Particle: Smoke / Irritation (16x16)
  {
    name: "particle_smoke",
    width: 16,
    height: 16,
    draw: (png, ox, oy) => {
      // Dark moody swirl
      fillRect(png, ox + 4, oy + 4, 8, 8, 60, 50, 70, 200);
      fillRect(png, ox + 6, oy + 2, 4, 12, 80, 70, 90, 180);
      fillRect(png, ox + 2, oy + 6, 12, 4, 80, 70, 90, 180);
      setPixel(png, ox + 7, oy + 7, 140, 80, 100); // reddish core spark
    }
  },

  // 17. Particle: Sakura Petal (16x16)
  {
    name: "particle_sakura",
    width: 16,
    height: 16,
    draw: (png, ox, oy) => {
      fillRect(png, ox + 5, oy + 3, 6, 9, 255, 185, 205);
      fillRect(png, ox + 3, oy + 5, 10, 5, 255, 175, 195);
      setPixel(png, ox + 8, oy + 2, 255, 150, 180); // notch tip
      setPixel(png, ox + 8, oy + 12, 255, 210, 225);
    }
  },

  // 18. Icon: Tea Cup (24x24)
  {
    name: "icon_tea",
    width: 24,
    height: 24,
    draw: (png, ox, oy) => {
      // White bubble background
      fillRect(png, ox + 3, oy + 3, 18, 18, 255, 255, 255);
      fillRect(png, ox + 6, oy + 1, 12, 22, 255, 255, 255);
      fillRect(png, ox + 1, oy + 6, 22, 12, 255, 255, 255);
      // Green teacup
      fillRect(png, ox + 6, oy + 9, 10, 9, 100, 160, 90);
      fillRect(png, ox + 15, oy + 11, 3, 5, 100, 160, 90);
      // Steam whisps
      setPixel(png, ox + 8, oy + 6, 140, 190, 130);
      setPixel(png, ox + 11, oy + 5, 140, 190, 130);
      setPixel(png, ox + 14, oy + 6, 140, 190, 130);
    }
  },

  // 19. Icon: Coffee Cup (24x24)
  {
    name: "icon_coffee",
    width: 24,
    height: 24,
    draw: (png, ox, oy) => {
      fillRect(png, ox + 3, oy + 3, 18, 18, 255, 255, 255);
      fillRect(png, ox + 6, oy + 1, 12, 22, 255, 255, 255);
      fillRect(png, ox + 1, oy + 6, 22, 12, 255, 255, 255);
      // Brown mug
      fillRect(png, ox + 6, oy + 9, 10, 9, 150, 75, 40);
      fillRect(png, ox + 15, oy + 11, 3, 5, 150, 75, 40);
      // Coffee steam
      setPixel(png, ox + 8, oy + 6, 200, 140, 100);
      setPixel(png, ox + 12, oy + 5, 200, 140, 100);
    }
  },

  // 20. Light Mask Radial (64x64) - Warm Amber for Additive Blending
  {
    name: "light_mask_radial",
    width: 64,
    height: 64,
    draw: (png, ox, oy) => {
      const cx = ox + 32;
      const cy = oy + 32;
      const radius = 30;
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d <= radius) {
            const factor = Math.cos((d / radius) * (Math.PI / 2));
            const alpha = Math.round(255 * factor * factor);
            // #FFAA33 in RGB: 255, 170, 51
            setPixel(png, cx + x, cy + y, 255, 170, 51, alpha);
          }
        }
      }
    }
  }
];

export function buildAtlas(): { png: PNG; json: { frames: Record<string, FrameData> } } {
  const atlasSize = 512;
  const png = new PNG({ width: atlasSize, height: atlasSize });
  // Initialize transparent
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 0;
  }

  const frames: Record<string, FrameData> = {};

  let currentX = 2;
  let currentY = 2;
  let rowHeight = 0;

  for (const sprite of sprites) {
    if (currentX + sprite.width + 2 > atlasSize) {
      currentX = 2;
      currentY += rowHeight + 2;
      rowHeight = 0;
    }

    sprite.draw(png, currentX, currentY);

    frames[sprite.name] = {
      frame: { x: currentX, y: currentY, w: sprite.width, h: sprite.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: sprite.width, h: sprite.height },
      sourceSize: { w: sprite.width, h: sprite.height }
    };

    currentX += sprite.width + 2;
    if (sprite.height > rowHeight) {
      rowHeight = sprite.height;
    }
  }

  return { png, json: { frames } };
}

export function exportAtlas(targetDir: string) {
  fs.mkdirSync(targetDir, { recursive: true });
  const { png, json } = buildAtlas();

  const pngPath = path.join(targetDir, "atlas.png");
  const jsonPath = path.join(targetDir, "atlas.json");

  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf-8");
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(pngPath, buffer);
  console.log(`[AssetPipeline] Exported atlas (${Object.keys(json.frames).length} sprites) to ${targetDir}`);
}

// CLI entrypoint
if (process.argv[1] && process.argv[1].includes("generate_demo_assets")) {
  const defaultDir = path.resolve(__dirname, "../../dist_assets");
  exportAtlas(defaultDir);

  // Also export directly to web-runtime public directory if exists
  const webRuntimePublic = path.resolve(__dirname, "../../../../apps/web-runtime/public/assets");
  exportAtlas(webRuntimePublic);
}
