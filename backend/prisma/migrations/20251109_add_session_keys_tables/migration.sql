-- CreateTable
CREATE TABLE "session_key_requests" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "chat_id" VARCHAR(255) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "max_transactions" INTEGER NOT NULL DEFAULT 100,
    "max_amount_per_tx" BIGINT NOT NULL,
    "allowed_programs" TEXT[],
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending_auth',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "session_key_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "session_key_public" VARCHAR(255) NOT NULL,
    "session_key_private" TEXT NOT NULL,
    "encryption_iv" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "max_transactions" INTEGER NOT NULL DEFAULT 100,
    "max_amount_per_tx" BIGINT NOT NULL,
    "allowed_programs" TEXT[],
    "status" VARCHAR(50) NOT NULL DEFAULT 'authorized',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "transactions_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "user_ip" VARCHAR(100),
    "user_agent" VARCHAR(500),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_transactions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "signature" VARCHAR(255) NOT NULL,
    "amount" BIGINT NOT NULL,
    "from_token" VARCHAR(255) NOT NULL,
    "to_token" VARCHAR(255) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_key_requests_user_id_idx" ON "session_key_requests"("user_id");

-- CreateIndex
CREATE INDEX "session_key_requests_status_idx" ON "session_key_requests"("status");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_is_active_idx" ON "user_sessions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "session_transactions_session_id_idx" ON "session_transactions"("session_id");

-- CreateIndex
CREATE INDEX "session_transactions_created_at_idx" ON "session_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "session_transactions" ADD CONSTRAINT "session_transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
