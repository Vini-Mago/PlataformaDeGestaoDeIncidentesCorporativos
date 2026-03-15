-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "criticity" TEXT NOT NULL,
    "service_affected" TEXT,
    "requester_id" TEXT NOT NULL,
    "assigned_team_id" TEXT,
    "assigned_to_id" TEXT,
    "problem_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_status_history" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "changed_by_id" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_comments" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replicated_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_event_occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replicated_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidents_requester_id_idx" ON "incidents"("requester_id");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_assigned_to_id_idx" ON "incidents"("assigned_to_id");

-- CreateIndex
CREATE INDEX "incidents_assigned_team_id_idx" ON "incidents"("assigned_team_id");

-- CreateIndex
CREATE INDEX "incidents_created_at_idx" ON "incidents"("created_at");

-- CreateIndex
CREATE INDEX "incident_status_history_incident_id_idx" ON "incident_status_history"("incident_id");

-- CreateIndex
CREATE INDEX "incident_comments_incident_id_idx" ON "incident_comments"("incident_id");

-- CreateIndex
CREATE INDEX "outbox_published_at_idx" ON "outbox"("published_at");

-- CreateIndex
CREATE INDEX "replicated_users_email_idx" ON "replicated_users"("email");

-- AddForeignKey
ALTER TABLE "incident_status_history" ADD CONSTRAINT "incident_status_history_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_comments" ADD CONSTRAINT "incident_comments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
