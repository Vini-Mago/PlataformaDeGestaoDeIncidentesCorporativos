CREATE TABLE "problem_versions" (
    "id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "changed_by_id" TEXT,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "problem_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "change_versions" (
    "id" TEXT NOT NULL,
    "change_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "changed_by_id" TEXT,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "change_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "problem_versions_problem_id_version_number_key" ON "problem_versions"("problem_id", "version_number");
CREATE INDEX "problem_versions_problem_id_created_at_idx" ON "problem_versions"("problem_id", "created_at");

CREATE UNIQUE INDEX "change_versions_change_id_version_number_key" ON "change_versions"("change_id", "version_number");
CREATE INDEX "change_versions_change_id_created_at_idx" ON "change_versions"("change_id", "created_at");

ALTER TABLE "problem_versions" ADD CONSTRAINT "problem_versions_problem_id_fkey"
  FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "change_versions" ADD CONSTRAINT "change_versions_change_id_fkey"
  FOREIGN KEY ("change_id") REFERENCES "changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
