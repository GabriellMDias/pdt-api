-- AlterEnum
ALTER TYPE "ScriptRunStatus" ADD VALUE 'RUNNING';

-- CreateTable
CREATE TABLE "CodeJob" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "handler" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT DEFAULT 'America/Sao_Paulo',
    "scheduleType" "ScriptScheduleType" NOT NULL,
    "cronExpression" TEXT,
    "intervalSeconds" INTEGER,
    "dailyAtTime" TEXT,
    "weeklyWeekday" INTEGER,
    "weeklyTime" TEXT,
    "lastStatus" "ScriptRunStatus",
    "latestRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeJobRun" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "status" "ScriptRunStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "log" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeJobRun_jobId_createdAt_idx" ON "CodeJobRun"("jobId", "createdAt");

-- AddForeignKey
ALTER TABLE "CodeJobRun" ADD CONSTRAINT "CodeJobRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CodeJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
