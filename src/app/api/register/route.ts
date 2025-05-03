import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  await client.connect();
  const users = client.db().collection("users");
  const existing = await users.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "User exists" }, { status: 400 });
  }
  await users.insertOne({ email, password }); // For production, hash the password!
  return NextResponse.json({ ok: true });
}