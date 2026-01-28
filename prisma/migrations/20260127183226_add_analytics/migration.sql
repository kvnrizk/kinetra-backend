-- CreateTable
CREATE TABLE "WhishPayment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "planId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "receiptUrl" TEXT NOT NULL,
    "whishReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhishPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerPayout" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL DEFAULT 'whish',
    "whishNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBodyMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "bodyFat" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBodyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExercisePersonalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "estimatedOneRm" DOUBLE PRECISION NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExercisePersonalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBodyMetric_userId_idx" ON "UserBodyMetric"("userId");

-- CreateIndex
CREATE INDEX "UserBodyMetric_createdAt_idx" ON "UserBodyMetric"("createdAt");

-- CreateIndex
CREATE INDEX "ExercisePersonalRecord_userId_idx" ON "ExercisePersonalRecord"("userId");

-- CreateIndex
CREATE INDEX "ExercisePersonalRecord_exerciseId_idx" ON "ExercisePersonalRecord"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "ExercisePersonalRecord_userId_exerciseId_key" ON "ExercisePersonalRecord"("userId", "exerciseId");

-- AddForeignKey
ALTER TABLE "WhishPayment" ADD CONSTRAINT "WhishPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhishPayment" ADD CONSTRAINT "WhishPayment_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhishPayment" ADD CONSTRAINT "WhishPayment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerPayout" ADD CONSTRAINT "TrainerPayout_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBodyMetric" ADD CONSTRAINT "UserBodyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExercisePersonalRecord" ADD CONSTRAINT "ExercisePersonalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExercisePersonalRecord" ADD CONSTRAINT "ExercisePersonalRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
