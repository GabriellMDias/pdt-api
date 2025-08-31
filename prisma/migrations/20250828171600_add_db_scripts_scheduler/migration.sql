-- CreateEnum
CREATE TYPE "ScriptScheduleType" AS ENUM ('CRON', 'INTERVAL', 'DAILY_AT', 'WEEKLY_AT');

-- CreateEnum
CREATE TYPE "ScriptRunStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "DbScript" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sqlText" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduleType" "ScriptScheduleType" NOT NULL DEFAULT 'CRON',
    "cronExpression" TEXT,
    "intervalSeconds" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "timeoutSec" INTEGER NOT NULL DEFAULT 600,
    "wrapInTransaction" BOOLEAN NOT NULL DEFAULT false,
    "searchPath" TEXT,
    "lastStatus" "ScriptRunStatus",
    "latestRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DbScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DbScriptRun" (
    "id" SERIAL NOT NULL,
    "scriptId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "ScriptRunStatus" NOT NULL,
    "rowsAffected" INTEGER,
    "error" TEXT,
    "durationMs" INTEGER,
    "triggeredBy" TEXT,
    "appInstanceId" TEXT,

    CONSTRAINT "DbScriptRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DbScriptRun_scriptId_idx" ON "DbScriptRun"("scriptId");

-- AddForeignKey
ALTER TABLE "DbScriptRun" ADD CONSTRAINT "DbScriptRun_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "DbScript"("id") ON DELETE CASCADE ON UPDATE CASCADE;
