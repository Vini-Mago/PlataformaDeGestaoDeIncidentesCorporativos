import { Client } from "pg";

interface Args {
  dryRun: boolean;
  accessLogsDays: number;
  passwordResetDays: number;
  revokedSessionsDays: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: argv.includes("--dry-run"),
    accessLogsDays: Number(process.env.LGPD_ACCESS_LOG_RETENTION_DAYS ?? 180),
    passwordResetDays: Number(process.env.LGPD_PASSWORD_RESET_RETENTION_DAYS ?? 30),
    revokedSessionsDays: Number(process.env.LGPD_REVOKED_SESSION_RETENTION_DAYS ?? 90),
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--access-logs-days") args.accessLogsDays = Number(argv[i + 1]);
    if (argv[i] === "--password-reset-days") args.passwordResetDays = Number(argv[i + 1]);
    if (argv[i] === "--revoked-sessions-days") args.revokedSessionsDays = Number(argv[i + 1]);
  }

  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.IDENTITY_DATABASE_URL;
  if (!databaseUrl) throw new Error("IDENTITY_DATABASE_URL is required");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    const counts = {
      accessLogs: 0,
      passwordResetTokens: 0,
      revokedSessions: 0,
    };

    const accessRes = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM access_logs WHERE created_at < NOW() - ($1::text || ' days')::interval`,
      [String(args.accessLogsDays)]
    );
    counts.accessLogs = Number(accessRes.rows[0]?.count ?? 0);

    const resetRes = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM password_reset_tokens WHERE created_at < NOW() - ($1::text || ' days')::interval`,
      [String(args.passwordResetDays)]
    );
    counts.passwordResetTokens = Number(resetRes.rows[0]?.count ?? 0);

    const revokedRes = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM auth_sessions WHERE revoked_at IS NOT NULL AND revoked_at < NOW() - ($1::text || ' days')::interval`,
      [String(args.revokedSessionsDays)]
    );
    counts.revokedSessions = Number(revokedRes.rows[0]?.count ?? 0);

    if (args.dryRun) {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ dryRun: true, policy: args, wouldDelete: counts }, null, 2));
      return;
    }

    await client.query(
      `DELETE FROM access_logs WHERE created_at < NOW() - ($1::text || ' days')::interval`,
      [String(args.accessLogsDays)]
    );
    await client.query(
      `DELETE FROM password_reset_tokens WHERE created_at < NOW() - ($1::text || ' days')::interval`,
      [String(args.passwordResetDays)]
    );
    await client.query(
      `DELETE FROM auth_sessions WHERE revoked_at IS NOT NULL AND revoked_at < NOW() - ($1::text || ' days')::interval`,
      [String(args.revokedSessionsDays)]
    );

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          pruned: true,
          policy: args,
          deleted: counts,
        },
        null,
        2
      )
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[lgpd-prune] ${message}`);
  process.exit(1);
});
