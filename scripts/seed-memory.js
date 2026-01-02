const { Client } = require("pg");
const neo4j = require("neo4j-driver");

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
};

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://raven-docs_user:raven-docs_secure_password@localhost:5432/raven-docs";
const MEMGRAPH_URI = process.env.MEMGRAPH_URI || "bolt://localhost:7687";
const MEMGRAPH_USER = process.env.MEMGRAPH_USER || "";
const MEMGRAPH_PASSWORD = process.env.MEMGRAPH_PASSWORD || "";

const seed = async () => {
  const summary =
    getArgValue("--summary") || "Seed memory: daily focus";
  const contentText =
    getArgValue("--content") ||
    "Confirmed Memgraph is running and the memory UI is wired up.";
  const tagsRaw = getArgValue("--tags") || "seed,memory";
  const source = getArgValue("--source") || "seed";

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const workspaceId =
    getArgValue("--workspaceId") ||
    (await client.query("select id from workspaces order by created_at asc limit 1")).rows[0]?.id;
  const spaceId =
    getArgValue("--spaceId") ||
    (await client.query("select id from spaces order by created_at asc limit 1")).rows[0]?.id;
  const creatorId =
    getArgValue("--userId") ||
    (await client.query("select id from users order by created_at asc limit 1")).rows[0]?.id;

  if (!workspaceId || !spaceId || !creatorId) {
    throw new Error("Missing workspace/space/user ids to seed memory.");
  }

  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const insert = await client.query(
    "insert into agent_memories (workspace_id, space_id, creator_id, source, summary, content, tags, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7, now(), now()) returning id, created_at",
    [
      workspaceId,
      spaceId,
      creatorId,
      source,
      summary,
      JSON.stringify({ text: contentText }),
      JSON.stringify(tags),
    ],
  );

  const { id, created_at: createdAt } = insert.rows[0];
  await client.end();

  const driver =
    MEMGRAPH_USER && MEMGRAPH_PASSWORD
      ? neo4j.driver(MEMGRAPH_URI, neo4j.auth.basic(MEMGRAPH_USER, MEMGRAPH_PASSWORD))
      : neo4j.driver(MEMGRAPH_URI);
  const session = driver.session();

  const timestamp = new Date(createdAt);
  await session.run(
    "MERGE (m:Memory {id: $id}) SET m.workspaceId=$workspaceId, m.spaceId=$spaceId, m.source=$source, m.summary=$summary, m.tags=$tags, m.timestamp=$timestamp, m.timestampMs=$timestampMs, m.embedding=$embedding, m.embeddingModel=$embeddingModel, m.contentRef=$contentRef",
    {
      id,
      workspaceId,
      spaceId,
      source,
      summary,
      tags,
      timestamp: timestamp.toISOString(),
      timestampMs: timestamp.getTime(),
      embedding: [],
      embeddingModel: "text-embedding-004",
      contentRef: id,
    },
  );

  await session.close();
  await driver.close();

  console.log("Seeded memory", id);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
