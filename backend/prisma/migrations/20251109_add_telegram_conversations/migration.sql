-- CreateTable
CREATE TABLE "telegram_conversations" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "chat_id" VARCHAR(255) NOT NULL,
    "workflow_id" VARCHAR(255),
    "current_state" VARCHAR(100) NOT NULL DEFAULT 'IDLE',
    "state_data" JSONB,
    "last_message_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_conversations_user_id_chat_id_key" ON "telegram_conversations"("user_id", "chat_id");

-- CreateIndex
CREATE INDEX "telegram_conversations_user_id_idx" ON "telegram_conversations"("user_id");

-- CreateIndex
CREATE INDEX "telegram_conversations_workflow_id_idx" ON "telegram_conversations"("workflow_id");

-- CreateIndex
CREATE INDEX "telegram_conversations_current_state_idx" ON "telegram_conversations"("current_state");
