import "dotenv/config";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
neonConfig.webSocketConstructor = ws as any;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log("Seeding database...");

  // Create organizer family (upsert via raw SQL)
  const familyResult = await pool.query(
    `INSERT INTO "Family" (name, "contactName", "createdAt", "updatedAt")
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    ["Dangol Family", "Suman Dangol"]
  );
  const organizer = familyResult.rows[0];
  console.log(`  Created family: ${organizer.name}`);

  // Create a sample upcoming event
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 14);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 2);

  const eventResult = await pool.query(
    `INSERT INTO "CampingEvent" (title, location, "locationUrl", description, "startDate", "endDate", "organizerFamilyId", status, "inviteCode", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, gen_random_uuid(), NOW(), NOW())
     RETURNING id, title`,
    [
      "Summer Camping at Sun Lakes",
      "Sun Lakes-Dry Falls State Park",
      "https://maps.app.goo.gl/sunlakes",
      "Annual summer camping trip! 3 days of fun, food, and family time at Sun Lakes. Beautiful scenery, swimming, hiking, and great Nepali food!",
      startDate,
      endDate,
      organizer.id,
      "upcoming",
    ]
  );
  const event = eventResult.rows[0];
  console.log(`  Created event: ${event.title}`);

  // Auto-signup the organizer
  await pool.query(
    `INSERT INTO "EventSignup" ("eventId", "familyId", adults, kids, elderly, vegetarians, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT ("eventId", "familyId") DO NOTHING`,
    [event.id, organizer.id, 2, 2, 1, 1]
  );
  console.log("  Organizer auto-signed up");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
