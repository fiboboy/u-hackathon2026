"""
SpatialTwin Asset Extraction and Atlas Packing Pipeline
Processes:
1. spa_floor_only_stage -> clean open-floor 2.5D architectural base (diorama_master.png) without interior walls
2. spa_modular_walls_sheet -> 6 modular 2.5D interior walls with transparent doorway/window cutouts
3. raw_spritesheet.png -> flood-fill border background removal for all furniture & UI sprites
4. spa_characters_sheet.png -> flood-fill border background removal for all 8 character sprites
5. Packs all sprites into Phaser 3 texture atlas (atlas.png + atlas.json) via free-tex-packer-cli.
"""

import os
import shutil
import json
import subprocess
import cv2
import numpy as np

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
SPRITES_DIR = os.path.join(PIPELINE_DIR, "sprites")
DIST_DIR = os.path.join(PIPELINE_DIR, "dist_assets")
WEB_ASSETS_DIR = os.path.abspath(os.path.join(PIPELINE_DIR, "../../apps/web-runtime/public/assets"))

ARTIFACT_FLOOR_STAGE = r"C:\Users\maodz\.gemini\antigravity\brain\40650433-fc86-4d6c-9340-ac69f63d844d\spa_floor_only_stage_1792113136785.jpg"
ARTIFACT_WALLS = r"C:\Users\maodz\.gemini\antigravity\brain\40650433-fc86-4d6c-9340-ac69f63d844d\spa_modular_walls_sheet_1792113174924.jpg"
ARTIFACT_CHARS = r"C:\Users\maodz\.gemini\antigravity\brain\40650433-fc86-4d6c-9340-ac69f63d844d\spa_characters_sheet_1792111296734.jpg"

os.makedirs(SPRITES_DIR, exist_ok=True)
os.makedirs(DIST_DIR, exist_ok=True)
os.makedirs(WEB_ASSETS_DIR, exist_ok=True)


def remove_exterior_background(crop_bgr, bg_sample, tolerance=8, keep_main_cluster=True, allow_inner_cutouts=False):
    h, w, _ = crop_bgr.shape
    diff = np.max(np.abs(crop_bgr.astype(np.int32) - bg_sample.astype(np.int32)), axis=2)
    is_bg_candidate = (diff <= tolerance).astype(np.uint8)

    if allow_inner_cutouts:
        # For walls with open doorways or pass-through windows, any pixel matching the flat #211f2a background is transparent
        exterior_mask = is_bg_candidate > 0
    else:
        padded = np.ones((h + 2, w + 2), dtype=np.uint8)
        padded[1:h + 1, 1:w + 1] = is_bg_candidate
        mask = np.zeros((h + 4, w + 4), dtype=np.uint8)
        cv2.floodFill(padded, mask, (0, 0), 2)
        exterior_mask = (padded[1:h + 1, 1:w + 1] == 2)

    alpha = np.where(exterior_mask, 0, 255).astype(np.uint8)

    if keep_main_cluster:
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), connectivity=8)
        if num_labels > 2:
            areas = stats[1:, cv2.CC_STAT_AREA]
            max_area = np.max(areas)
            for comp_id in range(1, num_labels):
                area = stats[comp_id, cv2.CC_STAT_AREA]
                bx = stats[comp_id, cv2.CC_STAT_LEFT]
                by = stats[comp_id, cv2.CC_STAT_TOP]
                bw = stats[comp_id, cv2.CC_STAT_WIDTH]
                bh = stats[comp_id, cv2.CC_STAT_HEIGHT]
                touches_edge = (bx == 0) or (by == 0) or (bx + bw >= w) or (by + bh >= h)
                if area < 20 or (touches_edge and area < max_area * 0.25):
                    alpha[labels == comp_id] = 0

    rgba = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    return rgba


def clean_and_crop(sprite_rgba):
    alpha = sprite_rgba[:, :, 3]
    coords = cv2.findNonZero(alpha)
    if coords is None:
        return None
    x, y, w, h = cv2.boundingRect(coords)
    return sprite_rgba[y:y + h, x:x + w]


def build_open_floor_stage():
    print("[Pipeline] 1. Processing spa_floor_only_stage into diorama_master.png...")
    floor_src = os.path.join(PIPELINE_DIR, "spa_floor_only_stage.png")
    if os.path.exists(ARTIFACT_FLOOR_STAGE):
        img = cv2.imread(ARTIFACT_FLOOR_STAGE)
        cv2.imwrite(floor_src, img)
    elif os.path.exists(floor_src):
        img = cv2.imread(floor_src)
    else:
        raise FileNotFoundError("Missing spa_floor_only_stage image!")

    shell_resized = cv2.resize(img, (1024, 572), interpolation=cv2.INTER_AREA)

    h, w, _ = shell_resized.shape
    bg_color = np.median(shell_resized[0:20, 0:20], axis=(0, 1))
    diff = np.max(np.abs(shell_resized.astype(np.float32) - bg_color.astype(np.float32)), axis=2)

    is_ext_candidate = (diff <= 30).astype(np.uint8)
    padded = np.ones((h + 2, w + 2), dtype=np.uint8)
    padded[1:h + 1, 1:w + 1] = is_ext_candidate
    mask = np.zeros((h + 4, w + 4), dtype=np.uint8)
    cv2.floodFill(padded, mask, (0, 0), 2)
    ext_region = (padded[1:h + 1, 1:w + 1] == 2)

    rgba = cv2.cvtColor(shell_resized, cv2.COLOR_BGR2BGRA)
    alpha = np.full((h, w), 255, dtype=np.uint8)
    alpha[ext_region] = 0
    rgba[:, :, 3] = alpha

    out_master = os.path.join(WEB_ASSETS_DIR, "diorama_master.png")
    cv2.imwrite(out_master, rgba)
    cv2.imwrite(os.path.join(PIPELINE_DIR, "building_shell.png"), rgba)
    print(f"  ✓ Saved open-floor architectural stage -> {out_master} (1024x572)")


def extract_sheet_sprites():
    print("[Pipeline] 2. Processing raw_spritesheet.png furniture & UI sprites...")
    for f in os.listdir(SPRITES_DIR):
        if f.endswith(".png"):
            os.remove(os.path.join(SPRITES_DIR, f))

    sheet_path = os.path.join(PIPELINE_DIR, "raw_spritesheet.png")
    sheet = cv2.imread(sheet_path)
    bg_sample = np.median(sheet[420:470, 500:550], axis=(0, 1))

    SPRITE_BOXES = {
        "massage_bed_wood": [11, 25, 208, 165],
        "massage_bed_wood_left": [11, 25, 208, 165],
        "onsen_tub": [241, 25, 241, 175],
        "reception_desk": [508, 25, 178, 167],
        "aroma_burner": [732, 55, 64, 75],
        "aroma_burner_01": [732, 55, 64, 75],
        "shoji_screen": [811, 25, 104, 156],
        "shoji_screen_01": [811, 25, 104, 156],
        "bamboo_plant": [930, 25, 79, 203],
        "bamboo_plant_01": [930, 25, 79, 203],
        "massage_bed_wood_right": [15, 210, 201, 167],
        "aroma_burner_02": [265, 231, 76, 72],
        "shoji_screen_02": [412, 203, 153, 198],
        "bamboo_plant_02": [592, 226, 85, 194],
        "sofa_armchair": [732, 231, 147, 147],
        "sofa_armchair_cream": [732, 231, 147, 147],
        "armchair_cream": [892, 278, 115, 132],
        "armchair_purple": [11, 374, 119, 132],
        "armchair_purple_01": [11, 374, 119, 132],
        "armchair_purple_02": [11, 374, 119, 132],
        "tea_table": [832, 378, 80, 64],
        "tea_table_wood": [832, 378, 80, 64],
        "tea_table_dark": [132, 424, 82, 66],
        "stamina_bar_empty": [7, 551, 87, 17],
        "stamina_bar_green": [103, 551, 86, 17],
        "stamina_bar_blue": [207, 551, 85, 17],
        "bubble_happy": [225, 507, 31, 31],
        "bubble_calm": [272, 507, 32, 31],
        "bubble_big_smile": [319, 498, 35, 37],
        "bubble_love": [366, 498, 35, 48],
        "icon_smile": [412, 536, 27, 27],
        "icon_blush": [431, 517, 27, 25],
        "icon_heart": [466, 516, 47, 47],
        "icon_sleep_z": [670, 516, 31, 33],
    }

    for name, (bx, by, bw, bh) in SPRITE_BOXES.items():
        crop_bgr = sheet[by:by + bh, bx:bx + bw]
        rgba = remove_exterior_background(crop_bgr, bg_sample, tolerance=8, keep_main_cluster=True)
        trimmed = clean_and_crop(rgba)
        if trimmed is not None:
            out_file = os.path.join(SPRITES_DIR, f"{name}.png")
            cv2.imwrite(out_file, trimmed)
            print(f"  ✓ Saved furniture/UI sprite: {name} ({trimmed.shape[1]}x{trimmed.shape[0]})")


def extract_modular_walls():
    print("[Pipeline] 3. Extracting modular 2.5D walls from spa_modular_walls_sheet...")
    walls_src = os.path.join(PIPELINE_DIR, "spa_modular_walls_sheet.png")
    if os.path.exists(ARTIFACT_WALLS):
        img = cv2.imread(ARTIFACT_WALLS)
        cv2.imwrite(walls_src, img)
    elif os.path.exists(walls_src):
        img = cv2.imread(walls_src)
    else:
        raise FileNotFoundError("Missing spa_modular_walls_sheet.png")

    h, w, _ = img.shape
    cw, ch = w // 3, h // 2
    bg_sample = np.median(img[0:20, 0:50], axis=(0, 1))

    WALL_GRID = [
        (0, 0, "wall_shoji_door_left", True),
        (0, 1, "wall_shoji_sakura_left", False),
        (0, 2, "wall_plaster_lantern_left", False),
        (1, 0, "wall_shoji_front_right", False),
        (1, 1, "wall_divider_scroll_right", False),
        (1, 2, "wall_reception_window_right", True),
    ]

    for row, col, name, has_cutout in WALL_GRID:
        cell_bgr = img[row * ch:(row + 1) * ch, col * cw:(col + 1) * cw]
        rgba = remove_exterior_background(
            cell_bgr,
            bg_sample,
            tolerance=26,
            keep_main_cluster=True,
            allow_inner_cutouts=has_cutout
        )
        rgba[:, :, 3] = cv2.erode(rgba[:, :, 3], np.ones((3, 3), np.uint8), iterations=2)
        trimmed = clean_and_crop(rgba)
        if trimmed is not None:
            th, tw = trimmed.shape[:2]
            target_w = 185
            target_h = max(1, int(round(th * (target_w / tw))))
            # Zero out RGB of transparent pixels and use INTER_NEAREST to preserve crisp pixel-art edges without background bleed
            clean_rgba = trimmed.copy()
            clean_rgba[clean_rgba[:, :, 3] == 0] = [0, 0, 0, 0]
            resized = cv2.resize(clean_rgba, (target_w, target_h), interpolation=cv2.INTER_NEAREST)

            out_file = os.path.join(SPRITES_DIR, f"{name}.png")
            cv2.imwrite(out_file, resized)
            print(f"  ✓ Extracted modular wall: {name} ({target_w}x{target_h})")


def extract_characters_sheet():
    print("[Pipeline] 4. Extracting clean character sprites from spa_characters_sheet...")
    chars_src = os.path.join(PIPELINE_DIR, "spa_characters_sheet.png")
    if os.path.exists(ARTIFACT_CHARS):
        img = cv2.imread(ARTIFACT_CHARS)
        cv2.imwrite(chars_src, img)
    elif os.path.exists(chars_src):
        img = cv2.imread(chars_src)
    else:
        raise FileNotFoundError("Missing spa_characters_sheet.png")

    h, w, _ = img.shape
    cw, ch = w // 4, h // 2
    bg_sample = np.median(img[0:20, 0:50], axis=(0, 1))

    CHAR_GRID = [
        (0, 0, "char_receptionist"),
        (0, 1, "char_masseuse_room1"),
        (0, 2, "char_masseur_room2"),
        (0, 3, "char_masseuse_room4"),
        (1, 0, "char_guest_kenji"),
        (1, 1, "char_customer_pink"),
        (1, 2, "char_guest_yukata"),
        (1, 3, "char_guest_relaxing"),
    ]

    for row, col, name in CHAR_GRID:
        cell_bgr = img[row * ch:(row + 1) * ch, col * cw:(col + 1) * cw]
        rgba = remove_exterior_background(cell_bgr, bg_sample, tolerance=14, keep_main_cluster=True)
        rgba[:, :, 3] = cv2.erode(rgba[:, :, 3], np.ones((2, 2), np.uint8), iterations=1)
        trimmed = clean_and_crop(rgba)
        if trimmed is not None:
            th, tw = trimmed.shape[:2]
            target_h = 80
            target_w = max(1, int(round(tw * (target_h / th))))
            clean_rgba = trimmed.copy()
            clean_rgba[clean_rgba[:, :, 3] == 0] = [0, 0, 0, 0]
            resized = cv2.resize(clean_rgba, (target_w, target_h), interpolation=cv2.INTER_NEAREST)

            out_file = os.path.join(SPRITES_DIR, f"{name}.png")
            cv2.imwrite(out_file, resized)
            print(f"  ✓ Extracted clean character: {name} ({target_w}x{target_h})")

    shutil.copyfile(os.path.join(SPRITES_DIR, "char_masseuse_room1.png"), os.path.join(SPRITES_DIR, "staff_master.png"))
    shutil.copyfile(os.path.join(SPRITES_DIR, "char_guest_kenji.png"), os.path.join(SPRITES_DIR, "guest_avatar.png"))


def create_procedural_extras():
    chest = np.zeros((44, 48, 4), dtype=np.uint8)
    chest[14:38, 8:40] = [55, 80, 125, 255]
    chest[8:16, 6:42] = [70, 105, 160, 255]
    chest[8:38, 14:17] = [50, 190, 240, 255]
    chest[8:38, 31:34] = [50, 190, 240, 255]
    chest[15:21, 22:26] = [80, 215, 255, 255]
    chest[7:8, 6:42] = [30, 25, 35, 255]
    chest[38:39, 8:40] = [30, 25, 35, 255]
    cv2.imwrite(os.path.join(SPRITES_DIR, "cash_chest.png"), chest)


def create_packer_config():
    images = []
    for f in sorted(os.listdir(SPRITES_DIR)):
        if f.endswith(".png"):
            images.append({
                "name": f.replace(".png", ""),
                "path": os.path.join(SPRITES_DIR, f).replace("\\", "/")
            })

    config = {
        "savePath": DIST_DIR.replace("\\", "/"),
        "images": images,
        "folders": [],
        "packOptions": {
            "textureName": "atlas",
            "textureFormat": "png",
            "exporter": "Phaser 3",
            "width": 2048,
            "height": 2048,
            "fixedSize": False,
            "powerOfTwo": True,
            "padding": 2,
            "extrude": 0,
            "allowRotation": False,
            "detectIdentical": False,
            "allowTrim": False,
            "alphaThreshold": 0,
            "tinify": False
        }
    }
    cfg_path = os.path.join(PIPELINE_DIR, "packer_config.json")
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    return cfg_path


def pack_atlas():
    print("[Pipeline] 5. Packing all sprites + modular walls into texture atlas...")
    cfg_path = create_packer_config()
    cmd = [
        "npx", "--yes", "free-tex-packer-cli",
        "--project", cfg_path,
        "--output", DIST_DIR
    ]
    subprocess.run(cmd, check=True, shell=True)

    for fname in ["atlas.png", "atlas.json"]:
        src = os.path.join(DIST_DIR, fname)
        if os.path.exists(src):
            dst = os.path.join(WEB_ASSETS_DIR, fname)
            shutil.copyfile(src, dst)
            print(f"  ✓ Copied {fname} -> {dst}")


if __name__ == "__main__":
    build_open_floor_stage()
    extract_sheet_sprites()
    extract_modular_walls()
    extract_characters_sheet()
    create_procedural_extras()
    pack_atlas()
    print("[Pipeline] COMPLETE! Open floor stage + modular walls + furniture & characters atlas deployed.")
