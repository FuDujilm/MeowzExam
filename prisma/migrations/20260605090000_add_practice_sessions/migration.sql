CREATE TABLE "practice_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "libraryCode" TEXT,
    "libraryName" TEXT,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnsweredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "practice_session_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_session_questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "practice_sessions_userId_sessionKey_key" ON "practice_sessions"("userId", "sessionKey");
CREATE INDEX "practice_sessions_userId_lastAnsweredAt_idx" ON "practice_sessions"("userId", "lastAnsweredAt");
CREATE INDEX "practice_sessions_libraryCode_idx" ON "practice_sessions"("libraryCode");
CREATE UNIQUE INDEX "practice_session_questions_sessionId_questionId_key" ON "practice_session_questions"("sessionId", "questionId");
CREATE INDEX "practice_session_questions_questionId_idx" ON "practice_session_questions"("questionId");

ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_session_questions" ADD CONSTRAINT "practice_session_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_session_questions" ADD CONSTRAINT "practice_session_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
