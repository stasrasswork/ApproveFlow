ALTER TABLE "notifications" ADD COLUMN "workspace_id" TEXT;

CREATE INDEX "notifications_workspace_id_idx" ON "notifications"("workspace_id");
