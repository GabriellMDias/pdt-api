/*
  Warnings:

  - Added the required column `departmentVrId1` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departmentVrId2` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
CREATE SEQUENCE department_id_seq;
ALTER TABLE "Department" ADD COLUMN     "departmentVrId1" INTEGER NOT NULL,
ADD COLUMN     "departmentVrId2" INTEGER NOT NULL,
ADD COLUMN     "level" INTEGER NOT NULL,
ALTER COLUMN "id" SET DEFAULT nextval('department_id_seq');
ALTER SEQUENCE department_id_seq OWNED BY "Department"."id";
