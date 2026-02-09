-- CreateEnum
CREATE TYPE "ParameterScope" AS ENUM ('GLOBAL', 'STORE', 'BOTH');

-- CreateEnum
CREATE TYPE "ParameterType" AS ENUM ('STRING', 'INT', 'BOOL', 'DECIMAL', 'JSON');

-- CreateTable
CREATE TABLE "ParameterGroup" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ParameterGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParameterDefinition" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ParameterType" NOT NULL DEFAULT 'STRING',
    "scope" "ParameterScope" NOT NULL DEFAULT 'BOTH',
    "groupId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParameterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParameterValue" (
    "id" SERIAL NOT NULL,
    "definitionId" INTEGER NOT NULL,
    "storeId" INTEGER,
    "tenantKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ParameterValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParameterGroup_code_key" ON "ParameterGroup"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ParameterDefinition_code_key" ON "ParameterDefinition"("code");

-- CreateIndex
CREATE INDEX "ParameterValue_storeId_idx" ON "ParameterValue"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ParameterValue_definitionId_tenantKey_key" ON "ParameterValue"("definitionId", "tenantKey");

-- AddForeignKey
ALTER TABLE "ParameterDefinition" ADD CONSTRAINT "ParameterDefinition_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ParameterGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParameterValue" ADD CONSTRAINT "ParameterValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ParameterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParameterValue" ADD CONSTRAINT "ParameterValue_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
