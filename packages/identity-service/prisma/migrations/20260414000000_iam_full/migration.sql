-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- AlterTable users
ALTER TABLE "users"
ADD COLUMN "login" TEXT,
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'active',
ADD COLUMN "phone" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "job_title" TEXT,
ADD COLUMN "photo_url" TEXT,
ADD COLUMN "preferred_language" TEXT,
ADD COLUMN "time_zone" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "users"
SET "login" = "email",
    "updated_at" = COALESCE("created_at", NOW())
WHERE "login" IS NULL;

ALTER TABLE "users"
ALTER COLUMN "login" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateTable roles
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable permissions
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable role_permissions
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_permission_overrides
CREATE TABLE "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable auth_sessions
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable password_reset_tokens
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "requester_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable access_logs
CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "identifier" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "method" TEXT,
    "path" TEXT,
    "event_type" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes users
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- Indexes roles
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- Indexes permissions
CREATE UNIQUE INDEX "permissions_module_action_scope_key" ON "permissions"("module", "action", "scope");

-- Indexes role_permissions
CREATE UNIQUE INDEX "role_permissions_role_name_permission_id_key" ON "role_permissions"("role_name", "permission_id");
CREATE INDEX "role_permissions_role_name_idx" ON "role_permissions"("role_name");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- Indexes user_permission_overrides
CREATE UNIQUE INDEX "user_permission_overrides_user_id_permission_id_key" ON "user_permission_overrides"("user_id", "permission_id");
CREATE INDEX "user_permission_overrides_user_id_idx" ON "user_permission_overrides"("user_id");
CREATE INDEX "user_permission_overrides_permission_id_idx" ON "user_permission_overrides"("permission_id");

-- Indexes auth_sessions
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE INDEX "auth_sessions_revoked_at_idx" ON "auth_sessions"("revoked_at");

-- Indexes password_reset_tokens
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");
CREATE INDEX "password_reset_tokens_used_at_idx" ON "password_reset_tokens"("used_at");

-- Indexes access_logs
CREATE INDEX "access_logs_user_id_idx" ON "access_logs"("user_id");
CREATE INDEX "access_logs_event_type_idx" ON "access_logs"("event_type");
CREATE INDEX "access_logs_created_at_idx" ON "access_logs"("created_at");

-- Foreign keys
ALTER TABLE "role_permissions"
ADD CONSTRAINT "role_permissions_role_name_fkey"
FOREIGN KEY ("role_name") REFERENCES "roles"("name") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
ADD CONSTRAINT "role_permissions_permission_id_fkey"
FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permission_overrides"
ADD CONSTRAINT "user_permission_overrides_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permission_overrides"
ADD CONSTRAINT "user_permission_overrides_permission_id_fkey"
FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
ADD CONSTRAINT "auth_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens"
ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "access_logs"
ADD CONSTRAINT "access_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
