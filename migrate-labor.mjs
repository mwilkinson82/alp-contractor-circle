import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS user_labor_library (
    id int AUTO_INCREMENT NOT NULL,
    memberId int NOT NULL,
    csiDivision varchar(8),
    description varchar(512) NOT NULL,
    unit varchar(32) NOT NULL,
    laborRate int NOT NULL,
    crewSize decimal(5,1),
    productivity decimal(10,2),
    notes text,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT user_labor_library_id PRIMARY KEY(id)
  )`,
  `CREATE TABLE IF NOT EXISTS estimate_markups (
    id int AUTO_INCREMENT NOT NULL,
    projectId int NOT NULL,
    memberId int NOT NULL,
    overheadPct int NOT NULL DEFAULT 1000,
    profitPct int NOT NULL DEFAULT 1000,
    contingencyPct int NOT NULL DEFAULT 500,
    bondPct int NOT NULL DEFAULT 150,
    taxPct int NOT NULL DEFAULT 0,
    generalConditionsPct int NOT NULL DEFAULT 0,
    customMarkups text,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT estimate_markups_id PRIMARY KEY(id)
  )`,
  `CREATE TABLE IF NOT EXISTS company_estimate_defaults (
    id int AUTO_INCREMENT NOT NULL,
    memberId int NOT NULL,
    overheadPct int NOT NULL DEFAULT 1000,
    profitPct int NOT NULL DEFAULT 1000,
    contingencyPct int NOT NULL DEFAULT 500,
    bondPct int NOT NULL DEFAULT 150,
    taxPct int NOT NULL DEFAULT 0,
    generalConditionsPct int NOT NULL DEFAULT 0,
    customMarkups text,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT company_estimate_defaults_id PRIMARY KEY(id),
    CONSTRAINT company_estimate_defaults_memberId_unique UNIQUE(memberId)
  )`
];

for (const sql of statements) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
  try {
    await conn.execute(sql);
    console.log(`✓ Created table: ${tableName}`);
  } catch (e) {
    console.error(`✗ Error creating ${tableName}:`, e.message);
  }
}

await conn.end();
console.log('Migration complete.');
