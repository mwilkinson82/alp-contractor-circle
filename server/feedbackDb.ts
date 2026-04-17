import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { feedback, type InsertFeedback, type Feedback } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db!;
}

export async function createFeedback(data: InsertFeedback): Promise<number> {
  const db = await getDb();
  const [result] = await db.insert(feedback).values(data);
  return result.insertId;
}

export async function getAllFeedback(): Promise<Feedback[]> {
  const db = await getDb();
  return db.select().from(feedback).orderBy(desc(feedback.createdAt));
}

export async function getFeedbackById(id: number): Promise<Feedback | undefined> {
  const db = await getDb();
  const rows = await db.select().from(feedback).where(eq(feedback.id, id));
  return rows[0];
}

export async function updateFeedbackStatus(
  id: number,
  status: "new" | "reviewed" | "in_progress" | "resolved" | "wont_fix",
  adminNotes?: string
): Promise<void> {
  const db = await getDb();
  const updates: any = { status };
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  await db.update(feedback).set(updates).where(eq(feedback.id, id));
}

export async function deleteFeedback(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(feedback).where(eq(feedback.id, id));
}
