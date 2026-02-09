-- CreateTable
CREATE TABLE "Store" (
    "id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "activeStatus" BOOLEAN NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);
