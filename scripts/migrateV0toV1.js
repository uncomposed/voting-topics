import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import crypto from "node:crypto";

const stanceFromScale = (n) => {
  if (n === undefined) return "neutral";
  if (n <= -2) return "against";
  if (n === -1) return "lean_against";
  if (n === 0) return "neutral";
  if (n === 1) return "lean_for";
  return "for";
};

const uuid = () => crypto.randomUUID();

const migrate = (v0) => {
  const topics = v0.topics.map(t => {
    // Convert old direction.scale to new stance
    let stance = "neutral";
    if (t.direction?.scale !== undefined) {
      stance = stanceFromScale(t.direction.scale);
    }
    
    // Convert old direction.custom to a direction if it exists
    let directions = [];
    if (t.direction?.custom && t.direction.custom.trim()) {
      directions = [{
        id: uuid(),
        text: t.direction.custom.trim(),
        stars: Math.max(0, Math.min(5, t.importance || 0)), // Use topic importance as initial direction stars
        sources: [],
        tags: []
      }];
    }

    return {
      id: t.id,
      title: t.title,
      importance: Math.max(0, Math.min(5, t.importance ?? 0)),
      stance,
      directions,
      notes: t.notes ?? "",
      sources: t.sources ?? [],
      relations: { broader: [], narrower: [], related: [] }
    };
  });

  return {
    version: "tsb.v1",
    title: v0.title,
    notes: v0.notes ?? "",
    topics,
    createdAt: v0.createdAt,
    updatedAt: new Date().toISOString()
  };
};

const inPath = process.argv[2];
if (!inPath) {
  console.error("Usage: node scripts/migrateV0toV1.js <input.json>");
  process.exit(1);
}

try {
  const raw = readFileSync(inPath, "utf8");
  const v0 = JSON.parse(raw);
  
  if (v0.version !== "tsb.v0") {
    console.error("Input file is not a tsb.v0 document");
    process.exit(1);
  }
  
  const v1 = migrate(v0);
  const outPath = join(dirname(inPath), basename(inPath).replace(/\.json$/, ".v1.json"));
  writeFileSync(outPath, JSON.stringify(v1, null, 2), "utf8");
  console.log("Successfully migrated to", outPath);
  console.log(`Converted ${v0.topics.length} topics`);
  
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}
