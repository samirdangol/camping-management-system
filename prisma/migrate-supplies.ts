/**
 * One-shot migration: copy GroceryItem + Equipment rows into the unified
 * Supply table, and their volunteer rows into SupplyVolunteer.
 *
 * Deploy ordering (run from repo root):
 *   1. npx prisma db push          # creates Supply + SupplyVolunteer tables
 *   2. npx tsx prisma/migrate-supplies.ts
 *   3. (verify counts in Prisma Studio)
 *   4. Delete legacy GroceryItem/Equipment models from schema.prisma and
 *      remove their relations on Family / CampingEvent.
 *   5. npx prisma db push --accept-data-loss   # drops legacy tables
 *
 * The script is idempotent: if Supply already has rows it exits without
 * copying again. To force a fresh re-run, TRUNCATE Supply / SupplyVolunteer
 * first.
 */
import "dotenv/config";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
neonConfig.webSocketConstructor = ws as any;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function scalar<T>(sql: string): Promise<T> {
  const { rows } = await pool.query(sql);
  return rows[0] && Object.values(rows[0])[0] as T;
}

async function main() {
  console.log("Migrating GroceryItem + Equipment → Supply...");

  const supplyCount = await scalar<number>(`SELECT COUNT(*)::int FROM "Supply"`);
  if (supplyCount > 0) {
    console.log(
      `  Supply already has ${supplyCount} row(s); refusing to copy again. ` +
        `TRUNCATE "Supply", "SupplyVolunteer" first if you intend to re-run.`
    );
    return;
  }

  const groceryCount = await scalar<number>(`SELECT COUNT(*)::int FROM "GroceryItem"`);
  const equipmentCount = await scalar<number>(`SELECT COUNT(*)::int FROM "Equipment"`);
  const groceryVolCount = await scalar<number>(`SELECT COUNT(*)::int FROM "GroceryVolunteer"`);
  const equipmentVolCount = await scalar<number>(`SELECT COUNT(*)::int FROM "EquipmentVolunteer"`);
  console.log(
    `  Source: ${groceryCount} grocery + ${equipmentCount} equipment ` +
      `(${groceryVolCount} + ${equipmentVolCount} volunteers)`
  );

  // Offset equipment ids past the largest grocery id to avoid PK collisions.
  // We preserve grocery ids 1:1 so existing GroceryVolunteer rows can be
  // copied with no remap.
  const groceryMaxId =
    (await scalar<number>(`SELECT COALESCE(MAX(id), 0)::int FROM "GroceryItem"`)) ?? 0;
  const offset = groceryMaxId + 1;
  console.log(`  Equipment id offset: +${offset}`);

  // Copy GroceryItem → Supply (preserve ids)
  await pool.query(`
    INSERT INTO "Supply"
      (id, "eventId", name, category, "assignedFamilyId", "assignedLabel",
       "sortOrder", notes, "createdAt", "updatedAt")
    SELECT id, "eventId", name, category, "assignedFamilyId", "assignedLabel",
           "sortOrder", notes, "createdAt", "updatedAt"
    FROM "GroceryItem"
  `);
  console.log(`  Copied ${groceryCount} grocery rows`);

  // Copy Equipment → Supply (offset ids; ownerFamilyId/Label → assignedFamilyId/Label)
  await pool.query(
    `
    INSERT INTO "Supply"
      (id, "eventId", name, category, "assignedFamilyId", "assignedLabel",
       "sortOrder", notes, "createdAt", "updatedAt")
    SELECT id + $1, "eventId", name, category, "ownerFamilyId", "ownerLabel",
           "sortOrder", notes, "createdAt", "updatedAt"
    FROM "Equipment"
  `,
    [offset]
  );
  console.log(`  Copied ${equipmentCount} equipment rows (offset ids)`);

  // Reset Supply id sequence so future inserts pick up after the highest id.
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('"Supply"', 'id'),
      COALESCE((SELECT MAX(id) FROM "Supply"), 0) + 1,
      false
    )
  `);
  console.log(`  Reset Supply id sequence`);

  // Copy GroceryVolunteer → SupplyVolunteer (groceryItemId == supplyId)
  await pool.query(`
    INSERT INTO "SupplyVolunteer" ("supplyId", "familyId", "createdAt")
    SELECT "groceryItemId", "familyId", "createdAt"
    FROM "GroceryVolunteer"
  `);
  console.log(`  Copied ${groceryVolCount} grocery volunteer rows`);

  // Copy EquipmentVolunteer → SupplyVolunteer (apply offset)
  await pool.query(
    `
    INSERT INTO "SupplyVolunteer" ("supplyId", "familyId", "createdAt")
    SELECT "equipmentId" + $1, "familyId", "createdAt"
    FROM "EquipmentVolunteer"
  `,
    [offset]
  );
  console.log(`  Copied ${equipmentVolCount} equipment volunteer rows`);

  // Verify counts
  const finalSupply = await scalar<number>(`SELECT COUNT(*)::int FROM "Supply"`);
  const finalVolunteers = await scalar<number>(
    `SELECT COUNT(*)::int FROM "SupplyVolunteer"`
  );
  const expectedSupply = groceryCount + equipmentCount;
  const expectedVolunteers = groceryVolCount + equipmentVolCount;
  if (finalSupply !== expectedSupply || finalVolunteers !== expectedVolunteers) {
    throw new Error(
      `Count mismatch — Supply: ${finalSupply}/${expectedSupply}, ` +
        `SupplyVolunteer: ${finalVolunteers}/${expectedVolunteers}`
    );
  }
  console.log(
    `  ✓ Verified: ${finalSupply} supplies, ${finalVolunteers} volunteers`
  );
  console.log("Migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
