-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN "planWeekWorkoutId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_planWeekWorkoutId_fkey" FOREIGN KEY ("planWeekWorkoutId") REFERENCES "PlanWeekWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
