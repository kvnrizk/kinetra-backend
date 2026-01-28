import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate estimated 1RM using Brzycki formula
   * 1RM = Weight × (1 + Reps ÷ 30)
   */
  private calculateOneRm(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    return weight * (1 + reps / 30);
  }

  /**
   * Get weight trend for a user over specified days
   */
  async getWeightTrend(userId: string, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bodyMetrics = await this.prisma.userBodyMetric.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        weight: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        weight: true,
        bodyFat: true,
        muscleMass: true,
      },
    });

    // Also check BodyMeasurement for weight data
    const bodyMeasurements = await this.prisma.bodyMeasurement.findMany({
      where: {
        userId,
        measuredAt: { gte: startDate },
        weightKg: { not: null },
      },
      orderBy: { measuredAt: 'asc' },
      select: {
        measuredAt: true,
        weightKg: true,
        bodyFatPct: true,
      },
    });

    // Combine and sort both data sources
    const combined = [
      ...bodyMetrics.map((m) => ({
        date: m.createdAt,
        weight: m.weight,
        bodyFat: m.bodyFat,
      })),
      ...bodyMeasurements.map((m) => ({
        date: m.measuredAt,
        weight: m.weightKg,
        bodyFat: m.bodyFatPct,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    return combined;
  }

  /**
   * Get exercise progress over time
   */
  async getExerciseProgress(userId: string, exerciseId: string, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get set logs from UserSetLog (linked to UserWorkoutSession)
    const userSetLogs = await this.prisma.userSetLog.findMany({
      where: {
        userWorkoutSession: { userId },
        exerciseId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        weightKg: true,
        reps: true,
      },
    });

    // Get set logs from SetLog (linked to WorkoutSession)
    const setLogs = await this.prisma.setLog.findMany({
      where: {
        session: { userId },
        workoutExercise: { exerciseId },
      },
      orderBy: { session: { startedAt: 'asc' } },
      include: {
        session: { select: { startedAt: true } },
      },
    });

    // Combine and format both data sources
    const combined = [
      ...userSetLogs.map((log) => ({
        date: log.createdAt,
        weight: log.weightKg || 0,
        reps: log.reps || 0,
        volume: (log.weightKg || 0) * (log.reps || 0),
        estimatedOneRm: this.calculateOneRm(log.weightKg || 0, log.reps || 0),
      })),
      ...setLogs
        .filter((log) => log.session.startedAt >= startDate)
        .map((log) => ({
          date: log.session.startedAt,
          weight: log.weight || 0,
          reps: log.reps || 0,
          volume: (log.weight || 0) * (log.reps || 0),
          estimatedOneRm: this.calculateOneRm(log.weight || 0, log.reps || 0),
        })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by date and get best set per day
    const dailyBest = new Map<string, (typeof combined)[0]>();
    combined.forEach((entry) => {
      const dateKey = entry.date.toISOString().split('T')[0];
      const existing = dailyBest.get(dateKey);
      if (!existing || entry.estimatedOneRm > existing.estimatedOneRm) {
        dailyBest.set(dateKey, entry);
      }
    });

    return Array.from(dailyBest.values());
  }

  /**
   * Get all personal records for a user
   */
  async getPersonalRecords(userId: string) {
    return this.prisma.exercisePersonalRecord.findMany({
      where: { userId },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            equipment: true,
            primaryMuscle: { select: { name: true } },
          },
        },
      },
      orderBy: { estimatedOneRm: 'desc' },
    });
  }

  /**
   * Check and update personal record for an exercise
   */
  async updatePersonalRecord(
    userId: string,
    exerciseId: string,
    weight: number,
    reps: number,
  ) {
    const estimatedOneRm = this.calculateOneRm(weight, reps);

    // Get existing PR
    const existing = await this.prisma.exercisePersonalRecord.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });

    const isNewPr = !existing || estimatedOneRm > existing.estimatedOneRm;

    // Only update if it's a new PR
    const pr = await this.prisma.exercisePersonalRecord.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      update: isNewPr
        ? { weight, reps, estimatedOneRm, achievedAt: new Date() }
        : {},
      create: { userId, exerciseId, weight, reps, estimatedOneRm },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            equipment: true,
          },
        },
      },
    });

    return { pr, isNewPr };
  }

  /**
   * Log a body metric entry
   */
  async logBodyMetric(
    userId: string,
    weight?: number,
    bodyFat?: number,
    muscleMass?: number,
    notes?: string,
  ) {
    return this.prisma.userBodyMetric.create({
      data: { userId, weight, bodyFat, muscleMass, notes },
    });
  }

  /**
   * Get client statistics summary (for trainer dashboard)
   */
  async getClientStats(userId: string) {
    const [
      userWorkoutCount,
      workoutSessionCount,
      volumeData,
      weightTrend,
      prs,
      lastWorkout,
    ] = await Promise.all([
      // Total workout count from UserWorkoutSession
      this.prisma.userWorkoutSession.count({
        where: { userId, status: 'COMPLETED' },
      }),

      // Total workout count from WorkoutSession
      this.prisma.workoutSession.count({
        where: { userId, status: 'COMPLETED' },
      }),

      // Total volume from UserSetLog
      this.prisma.userSetLog.aggregate({
        where: { userWorkoutSession: { userId } },
        _sum: { weightKg: true },
      }),

      // Weight trend (last 30 days)
      this.getWeightTrend(userId, 30),

      // Personal records
      this.getPersonalRecords(userId),

      // Last workout
      this.prisma.workoutSession.findFirst({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true, completedAt: true },
      }),
    ]);

    const workoutCount = userWorkoutCount + workoutSessionCount;

    // Calculate weight change
    let weightChange = 0;
    if (weightTrend.length >= 2) {
      const firstWeight = weightTrend[0].weight;
      const lastWeight = weightTrend[weightTrend.length - 1].weight;
      if (firstWeight && lastWeight) {
        weightChange = lastWeight - firstWeight;
      }
    }

    // Calculate total volume (sum of weight × reps)
    const setLogs = await this.prisma.userSetLog.findMany({
      where: { userWorkoutSession: { userId } },
      select: { weightKg: true, reps: true },
    });
    const totalVolume = setLogs.reduce(
      (sum, log) => sum + (log.weightKg || 0) * (log.reps || 0),
      0,
    );

    return {
      workoutCount,
      totalVolume: Math.round(totalVolume),
      weightChange: Math.round(weightChange * 10) / 10,
      personalRecordCount: prs.length,
      currentWeight: weightTrend.length > 0 ? weightTrend[weightTrend.length - 1].weight : null,
      lastWorkout: lastWorkout?.startedAt || null,
    };
  }

  /**
   * Get workout frequency stats
   */
  async getWorkoutFrequency(userId: string, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        startedAt: { gte: startDate },
      },
      select: { startedAt: true },
    });

    const userSessions = await this.prisma.userWorkoutSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        performedAt: { gte: startDate },
      },
      select: { performedAt: true },
    });

    // Group by week
    const weeklyCount = new Map<string, number>();

    // Process workout sessions
    sessions.forEach((s) => {
      const date = s.startedAt;
      if (date) {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyCount.set(weekKey, (weeklyCount.get(weekKey) || 0) + 1);
      }
    });

    // Process user workout sessions
    userSessions.forEach((s) => {
      const date = s.performedAt;
      if (date) {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyCount.set(weekKey, (weeklyCount.get(weekKey) || 0) + 1);
      }
    });

    return Array.from(weeklyCount.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  /**
   * Get volume progress over time
   */
  async getVolumeProgress(userId: string, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        startedAt: { gte: startDate },
      },
      include: {
        logs: {
          select: { weight: true, reps: true },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    return sessions.map((session) => {
      const totalVolume = session.logs.reduce(
        (sum, log) => sum + (log.weight || 0) * (log.reps || 0),
        0,
      );
      return {
        date: session.startedAt,
        volume: Math.round(totalVolume),
        setCount: session.logs.length,
      };
    });
  }

  /**
   * Get list of exercises user has done (for exercise selector)
   */
  async getUserExercises(userId: string) {
    const exerciseIds = await this.prisma.userSetLog.findMany({
      where: { userWorkoutSession: { userId } },
      select: { exerciseId: true },
      distinct: ['exerciseId'],
    });

    const setLogExercises = await this.prisma.setLog.findMany({
      where: { session: { userId } },
      select: { workoutExercise: { select: { exerciseId: true } } },
      distinct: ['workoutExerciseId'],
    });

    const allExerciseIds = [
      ...new Set([
        ...exerciseIds.map((e) => e.exerciseId),
        ...setLogExercises.map((e) => e.workoutExercise.exerciseId),
      ]),
    ];

    return this.prisma.exercise.findMany({
      where: { id: { in: allExerciseIds } },
      select: {
        id: true,
        name: true,
        equipment: true,
        primaryMuscle: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
