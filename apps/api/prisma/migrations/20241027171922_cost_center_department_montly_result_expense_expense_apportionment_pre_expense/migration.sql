-- CreateTable
CREATE TABLE "CostCenter" (
    "id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL,
    "costCenterId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MontlyResult" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recBruta" DOUBLE PRECISION NOT NULL,
    "devolucao" DOUBLE PRECISION NOT NULL,
    "imposto" DOUBLE PRECISION NOT NULL,
    "custo" DOUBLE PRECISION NOT NULL,
    "embalagem" DOUBLE PRECISION NOT NULL,
    "quebra" DOUBLE PRECISION NOT NULL,
    "recCom" DOUBLE PRECISION NOT NULL,
    "despesaPessoal" DOUBLE PRECISION NOT NULL,
    "despesaOperacional" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MontlyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseApportionment" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION,
    "useParticipation" BOOLEAN,

    CONSTRAINT "ExpenseApportionment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreExpense" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "PreExpense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MontlyResult" ADD CONSTRAINT "MontlyResult_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MontlyResult" ADD CONSTRAINT "MontlyResult_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApportionment" ADD CONSTRAINT "ExpenseApportionment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApportionment" ADD CONSTRAINT "ExpenseApportionment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApportionment" ADD CONSTRAINT "ExpenseApportionment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreExpense" ADD CONSTRAINT "PreExpense_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
