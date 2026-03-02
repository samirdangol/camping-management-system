import "dotenv/config";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
neonConfig.webSocketConstructor = ws as any;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log("Pushing schema changes to Neon...");

  // Feature 2: Add contactName2 to Family
  await pool.query(`ALTER TABLE "Family" ADD COLUMN IF NOT EXISTS "contactName2" TEXT`);
  console.log("  Added contactName2 to Family");

  // Feature 3: Add mealTag to GroceryItem
  await pool.query(`ALTER TABLE "GroceryItem" ADD COLUMN IF NOT EXISTS "mealTag" TEXT`);
  console.log("  Added mealTag to GroceryItem");

  // Feature 5: Add sortOrder to GroceryItem and Equipment
  await pool.query(`ALTER TABLE "GroceryItem" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`);
  console.log("  Added sortOrder to GroceryItem");

  await pool.query(`ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`);
  console.log("  Added sortOrder to Equipment");

  // Feature 4: Create GroceryVolunteer junction table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "GroceryVolunteer" (
      "id" SERIAL PRIMARY KEY,
      "groceryItemId" INTEGER NOT NULL REFERENCES "GroceryItem"("id") ON DELETE CASCADE,
      "familyId" INTEGER NOT NULL REFERENCES "Family"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("groceryItemId", "familyId")
    )
  `);
  console.log("  Created GroceryVolunteer table");

  // Feature 4: Create EquipmentVolunteer junction table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "EquipmentVolunteer" (
      "id" SERIAL PRIMARY KEY,
      "equipmentId" INTEGER NOT NULL REFERENCES "Equipment"("id") ON DELETE CASCADE,
      "familyId" INTEGER NOT NULL REFERENCES "Family"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("equipmentId", "familyId")
    )
  `);
  console.log("  Created EquipmentVolunteer table");

  // CampingEvent: reservation + campsite fields
  await pool.query(`ALTER TABLE "CampingEvent" ADD COLUMN IF NOT EXISTS "reservationNo" TEXT`);
  console.log("  Added reservationNo to CampingEvent");

  // Change checkIn/checkOut from TIMESTAMP to TEXT (time-only, e.g. "14:00")
  await pool.query(`ALTER TABLE "CampingEvent" ADD COLUMN IF NOT EXISTS "checkIn" TEXT`);
  await pool.query(`ALTER TABLE "CampingEvent" ALTER COLUMN "checkIn" TYPE TEXT USING "checkIn"::TEXT`);
  console.log("  checkIn column is TEXT");

  await pool.query(`ALTER TABLE "CampingEvent" ADD COLUMN IF NOT EXISTS "checkOut" TEXT`);
  await pool.query(`ALTER TABLE "CampingEvent" ALTER COLUMN "checkOut" TYPE TEXT USING "checkOut"::TEXT`);
  console.log("  checkOut column is TEXT");

  await pool.query(`ALTER TABLE "CampingEvent" ADD COLUMN IF NOT EXISTS "campsiteUrl" TEXT`);
  console.log("  Added campsiteUrl to CampingEvent");

  await pool.query(`ALTER TABLE "CampingEvent" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`);
  console.log("  Added imageUrl to CampingEvent");

  console.log("Schema push complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
