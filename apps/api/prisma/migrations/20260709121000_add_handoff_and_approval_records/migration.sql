CREATE TABLE "client_handoff_acks" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "task_event_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_handoff_acks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_approval_actions" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "task_event_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" "ClientApprovalType" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_approval_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_handoff_acks_task_event_id_key" ON "client_handoff_acks"("task_event_id");
CREATE UNIQUE INDEX "client_approval_actions_task_event_id_key" ON "client_approval_actions"("task_event_id");
CREATE INDEX "client_handoff_acks_task_id_created_at_idx" ON "client_handoff_acks"("task_id", "created_at");
CREATE INDEX "client_approval_actions_task_id_created_at_idx" ON "client_approval_actions"("task_id", "created_at");

ALTER TABLE "client_handoff_acks" ADD CONSTRAINT "client_handoff_acks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_handoff_acks" ADD CONSTRAINT "client_handoff_acks_task_event_id_fkey" FOREIGN KEY ("task_event_id") REFERENCES "task_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_handoff_acks" ADD CONSTRAINT "client_handoff_acks_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_approval_actions" ADD CONSTRAINT "client_approval_actions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_approval_actions" ADD CONSTRAINT "client_approval_actions_task_event_id_fkey" FOREIGN KEY ("task_event_id") REFERENCES "task_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_approval_actions" ADD CONSTRAINT "client_approval_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
