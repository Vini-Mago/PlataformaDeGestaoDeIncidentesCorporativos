import { Client } from "pg";

function parseArgs(argv: string[]): { userId?: string; dryRun: boolean } {
  let userId: string | undefined;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--user-id") {
      userId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
  }

  return { userId, dryRun };
}

function maskFromUserId(userId: string): { email: string; login: string; name: string } {
  const short = userId.replace(/-/g, "").slice(0, 12);
  return {
    email: `anon+${short}@example.invalid`,
    login: `anon_${short}`,
    name: `Anonymized User ${short}`,
  };
}

async function main(): Promise<void> {
  const { userId, dryRun } = parseArgs(process.argv.slice(2));
  if (!userId) {
    throw new Error("Usage: tsx scripts/privacy/anonymize-identity-user.ts --user-id <uuid> [--dry-run]");
  }

  const databaseUrl = process.env.IDENTITY_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("IDENTITY_DATABASE_URL is required");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    const userRes = await client.query<{
      id: string;
      email: string;
      login: string;
      name: string;
      status: "active" | "inactive";
    }>(
      `SELECT id, email, login, name, status::text as status FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (userRes.rowCount !== 1) {
      throw new Error(`User not found: ${userId}`);
    }

    const current = userRes.rows[0];
    const masked = maskFromUserId(userId);

    const planned = {
      userId,
      before: current,
      after: {
        email: masked.email,
        login: masked.login,
        name: masked.name,
        status: "inactive",
        phone: null,
        department: null,
        jobTitle: null,
        photoUrl: null,
        preferredLanguage: null,
        timeZone: null,
      },
      resetTokensDelete: true,
      revokeSessions: true,
      clearOAuthAccounts: true,
    };

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ dryRun: true, planned }, null, 2));
      return;
    }

    await client.query(
      `UPDATE users
       SET email = $2,
           login = $3,
           name = $4,
           status = 'inactive',
           phone = NULL,
           department = NULL,
           job_title = NULL,
           photo_url = NULL,
           preferred_language = NULL,
           time_zone = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, masked.email, masked.login, masked.name]
    );

    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, NOW()),
           revoke_reason = COALESCE(revoke_reason, 'lgpd_anonymization')
       WHERE user_id = $1`,
      [userId]
    );

    await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM oauth_accounts WHERE user_id = $1`, [userId]);

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          anonymized: true,
          userId,
          newIdentity: {
            email: masked.email,
            login: masked.login,
            name: masked.name,
          },
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
  console.error(`[lgpd-anonymize] ${message}`);
  process.exit(1);
});
