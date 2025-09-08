# Voting Topics Builder

A lightweight, open-source project for building and sharing transferable sample ballots. This tool helps voters organize their positions on ballot measures and candidate races with a collaborative, nuance-focused approach.

## Key Features

### **Stance + Directions Structure**
- **Stance**: Topic-level position using a 5-point Likert scale (Strongly Against → Strongly For)
- **Directions**: Multiple free-form outcomes per topic, each with individual 0-5 star importance ratings
- **Collaborative Design**: Avoids adversarial binaries by focusing on specific desired outcomes

### **Example Usage**
For a topic like "Firearms":
- **Directions**: 
  - "Much less death and injury by firearms" (5 stars)
  - "Allow responsible ownership and use" (4 stars) 
  - "Stronger background checks and safe storage norms" (4 stars)
  - "Invest in community violence interruption" (3 stars)

### **Topic Relations**
- SKOS-style linking between topics (broader/narrower/related)
- Keeps scope manageable while enabling nuanced navigation
- Example: "Climate change" → broader: "Environment & conservation"

## Schema Version: tsb.v1

The new schema separates stance (topic-level position) from directions (specific outcomes with individual importance ratings).

### Migration from v0
Use the migration script to convert existing data:
```bash
npx ts-node scripts/migrateV0toV1.ts your-file.json
```

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Export Options

- **JSON**: Full data export with versioning
- **PDF**: Formatted document with topics, stances, and directions
- **JPEG**: Social media share card

## Privacy & Design Principles

- **Anonymous by design**: No accounts, no IP storage
- **Local-first**: Data stored in your browser
- **Collaborative phrasing**: Neutral, outcome-focused language
- **Importance-based**: STAR-style 0-5 rating system (separate from electoral STAR Voting)

## Starter Pack

The app ships with a curated starter pack (`starter-pack.v2.4.json`) of neutral topics and outcome‑oriented directions. Use it to get going fast; you can always add your own topics and directions.

## Contributing

See [Contributing.md](Contributing.md) for development guidelines.
- Open source and community-driven development
