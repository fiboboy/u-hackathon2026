export interface Point2D {
  x: number;
  y: number;
}

export interface FloorZone {
  id: string;
  name: string;
  polygon: Point2D[];
}

export interface NavNode {
  id: string;
  x: number;
  y: number;
  zoneId: string;
  neighbors: string[];
}

export class SalonNavPhysics {
  // Walkable floor polygons calibrated to the 1024x572 open-floor stage + modular walls
  public static readonly FLOOR_ZONES: FloorZone[] = [
    {
      id: "reception_lounge",
      name: "Reception & Lounge",
      polygon: [
        { x: -425, y: 78 },
        { x: -295, y: 55 },
        { x: -165, y: 120 },
        { x: -55, y: 185 },
        { x: -65, y: 255 },
        { x: -425, y: 110 },
      ]
    },
    {
      id: "central_corridor",
      name: "Central Corridor",
      polygon: [
        { x: -220, y: 95 },
        { x: 65, y: -55 },
        { x: 165, y: -5 },
        { x: -115, y: 155 },
      ]
    },
    {
      id: "room1_tatami",
      name: "Room #1 (Sakura)",
      polygon: [
        { x: -355, y: 22 },
        { x: -215, y: -52 },
        { x: -85, y: 12 },
        { x: -230, y: 85 },
      ]
    },
    {
      id: "room2_tatami",
      name: "Room #2 (Bamboo)",
      polygon: [
        { x: -210, y: -55 },
        { x: -75, y: -125 },
        { x: 60, y: -58 },
        { x: -80, y: 10 },
      ]
    },
    {
      id: "room3_onsen_vip",
      name: "Onsen & VIP Tea Room",
      polygon: [
        { x: 95, y: -55 },
        { x: 185, y: -95 },
        { x: 405, y: 12 },
        { x: 265, y: 82 },
        { x: 155, y: 15 },
      ]
    },
    {
      id: "room4_tatami",
      name: "Room #3 (Zen)",
      polygon: [
        { x: 0, y: 95 },
        { x: 160, y: 15 },
        { x: 310, y: 90 },
        { x: 135, y: 178 },
      ]
    }
  ];

  // Doorway & Corridor Navigation Graph aligned with the open sliding doorways of the modular walls
  public static readonly NAV_GRAPH: Record<string, NavNode> = {
    n_reception: {
      id: "n_reception",
      x: -275,
      y: 148,
      zoneId: "reception_lounge",
      neighbors: ["n_corr_sw", "n_lounge"]
    },
    n_lounge: {
      id: "n_lounge",
      x: -145,
      y: 195,
      zoneId: "reception_lounge",
      neighbors: ["n_reception", "n_corr_sw"]
    },
    n_corr_sw: {
      id: "n_corr_sw",
      x: -175,
      y: 128,
      zoneId: "central_corridor",
      neighbors: ["n_reception", "n_lounge", "n_door_r1"]
    },
    n_door_r1: {
      id: "n_door_r1",
      x: -125,
      y: 88,
      zoneId: "central_corridor",
      neighbors: ["n_corr_sw", "n_room1", "n_corr_mid"]
    },
    n_room1: {
      id: "n_room1",
      x: -195,
      y: 35,
      zoneId: "room1_tatami",
      neighbors: ["n_door_r1"]
    },
    n_corr_mid: {
      id: "n_corr_mid",
      x: -65,
      y: 62,
      zoneId: "central_corridor",
      neighbors: ["n_door_r1", "n_door_r2"]
    },
    n_door_r2: {
      id: "n_door_r2",
      x: 15,
      y: 12,
      zoneId: "central_corridor",
      neighbors: ["n_corr_mid", "n_room2", "n_door_r4"]
    },
    n_room2: {
      id: "n_room2",
      x: -45,
      y: -38,
      zoneId: "room2_tatami",
      neighbors: ["n_door_r2"]
    },
    n_door_r4: {
      id: "n_door_r4",
      x: 55,
      y: 28,
      zoneId: "central_corridor",
      neighbors: ["n_door_r2", "n_room4", "n_corr_ne"]
    },
    n_room4: {
      id: "n_room4",
      x: 145,
      y: 95,
      zoneId: "room4_tatami",
      neighbors: ["n_door_r4"]
    },
    n_corr_ne: {
      id: "n_corr_ne",
      x: 105,
      y: -18,
      zoneId: "central_corridor",
      neighbors: ["n_door_r4", "n_onsen_entry"]
    },
    n_onsen_entry: {
      id: "n_onsen_entry",
      x: 155,
      y: -45,
      zoneId: "room3_onsen_vip",
      neighbors: ["n_corr_ne", "n_vip_lounge"]
    },
    n_vip_lounge: {
      id: "n_vip_lounge",
      x: 255,
      y: 2,
      zoneId: "room3_onsen_vip",
      neighbors: ["n_onsen_entry"]
    }
  };

  public static isPointInPolygon(px: number, py: number, poly: Point2D[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  public static getZoneAt(x: number, y: number): FloorZone | null {
    for (const z of SalonNavPhysics.FLOOR_ZONES) {
      if (SalonNavPhysics.isPointInPolygon(x, y, z.polygon)) {
        return z;
      }
    }
    return null;
  }

  private static closestPointOnSegment(px: number, py: number, a: Point2D, b: Point2D): Point2D {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    if (lenSq === 0) return { x: a.x, y: a.y };
    const t = Math.max(0, Math.min(1, ((px - a.x) * abx + (py - a.y) * aby) / lenSq));
    return {
      x: a.x + t * abx,
      y: a.y + t * aby
    };
  }

  public static clampToFloor(x: number, y: number): { x: number; y: number; zoneId: string } {
    const currentZone = SalonNavPhysics.getZoneAt(x, y);
    if (currentZone) {
      return { x: Math.round(x), y: Math.round(y), zoneId: currentZone.id };
    }

    let bestPt = { x: -65, y: 62 };
    let bestZoneId = "central_corridor";
    let minDist = Infinity;

    for (const z of SalonNavPhysics.FLOOR_ZONES) {
      const poly = z.polygon;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const cp = SalonNavPhysics.closestPointOnSegment(x, y, a, b);
        const d = Math.hypot(x - cp.x, y - cp.y);
        if (d < minDist) {
          minDist = d;
          bestPt = cp;
          bestZoneId = z.id;
        }
      }
    }

    return {
      x: Math.round(bestPt.x),
      y: Math.round(bestPt.y),
      zoneId: bestZoneId
    };
  }

  private static findNearestNavNode(x: number, y: number, preferredZoneId?: string): NavNode {
    const nodes = Object.values(SalonNavPhysics.NAV_GRAPH);
    let best = nodes[0];
    let bestScore = Infinity;

    for (const n of nodes) {
      const dist = Math.hypot(x - n.x, y - n.y);
      const zonePenalty = (preferredZoneId && n.zoneId !== preferredZoneId) ? 240 : 0;
      const score = dist + zonePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = n;
      }
    }
    return best;
  }

  public static findSalonPath(startX: number, startY: number, rawTargetX: number, rawTargetY: number): Point2D[] {
    const startClamped = SalonNavPhysics.clampToFloor(startX, startY);
    const targetClamped = SalonNavPhysics.clampToFloor(rawTargetX, rawTargetY);

    if (startClamped.zoneId === targetClamped.zoneId) {
      return [{ x: targetClamped.x, y: targetClamped.y }];
    }

    const startNode = SalonNavPhysics.findNearestNavNode(startClamped.x, startClamped.y, startClamped.zoneId);
    const endNode = SalonNavPhysics.findNearestNavNode(targetClamped.x, targetClamped.y, targetClamped.zoneId);

    if (startNode.id === endNode.id) {
      return [
        { x: startNode.x, y: startNode.y },
        { x: targetClamped.x, y: targetClamped.y }
      ];
    }

    const queue: string[][] = [[startNode.id]];
    const visited = new Set<string>([startNode.id]);
    let nodePath: string[] = [startNode.id, endNode.id];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const currId = path[path.length - 1];
      if (currId === endNode.id) {
        nodePath = path;
        break;
      }
      const currNode = SalonNavPhysics.NAV_GRAPH[currId];
      for (const nb of currNode?.neighbors || []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push([...path, nb]);
        }
      }
    }

    const waypoints: Point2D[] = [];
    for (const nid of nodePath) {
      const n = SalonNavPhysics.NAV_GRAPH[nid];
      if (n) {
        waypoints.push({ x: n.x, y: n.y });
      }
    }
    waypoints.push({ x: targetClamped.x, y: targetClamped.y });

    return waypoints;
  }
}
