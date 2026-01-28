import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainerEarningsService {
  constructor(private prisma: PrismaService) {}

  // Trainer commission percentage (70% to trainer, 30% platform fee)
  private readonly TRAINER_COMMISSION = 0.7;

  /**
   * Calculate how much a trainer has earned from their plans
   */
  async getTrainerEarnings(trainerId: string) {
    // Get all approved Whish payments for this trainer
    const approvedPayments = await this.prisma.whishPayment.findMany({
      where: {
        status: 'approved',
        trainerId,
      },
      include: {
        plan: true,
        client: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Calculate totals
    const totalEarned = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
    const trainerShare = Math.round(totalEarned * this.TRAINER_COMMISSION);

    // Get existing payouts to this trainer
    const payouts = await this.prisma.trainerPayout.findMany({
      where: { trainerId },
      select: { amount: true, status: true },
    });

    const totalPaidOut = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayouts = payouts
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const amountOwed = trainerShare - totalPaidOut - pendingPayouts;

    return {
      totalEarned, // Total from clients (in cents)
      platformFee: totalEarned - trainerShare, // Platform's cut (in cents)
      trainerShare, // Trainer's cut (in cents)
      totalPaidOut, // Already paid to trainer (in cents)
      pendingPayouts, // Payouts in progress (in cents)
      amountOwed: Math.max(0, amountOwed), // Still owed (in cents)
      paymentCount: approvedPayments.length,
      recentPayments: approvedPayments.slice(0, 5).map((p) => ({
        id: p.id,
        amount: p.amount,
        planName: p.plan?.name,
        clientName: p.client.fullName,
        date: p.approvedAt,
      })),
    };
  }

  /**
   * Get all trainers and their earnings summary (for admin)
   */
  async getAllTrainerEarnings() {
    // Get all trainers with approved payments
    const trainersWithPayments = await this.prisma.user.findMany({
      where: {
        role: { in: ['TRAINER', 'BOTH'] },
        trainerWhishPayments: {
          some: {
            status: 'approved',
          },
        },
      },
      include: {
        trainerProfile: true,
      },
    });

    const earnings = await Promise.all(
      trainersWithPayments.map(async (trainer) => {
        const trainerEarnings = await this.getTrainerEarnings(trainer.id);
        return {
          trainerId: trainer.id,
          trainerName: trainer.fullName || trainer.email,
          avatarUrl: trainer.avatarUrl,
          ...trainerEarnings,
        };
      })
    );

    // Sort by amount owed (descending)
    return earnings
      .filter((e) => e.amountOwed > 0)
      .sort((a, b) => b.amountOwed - a.amountOwed);
  }

  /**
   * Get payout history for a trainer
   */
  async getTrainerPayoutHistory(trainerId: string) {
    return this.prisma.trainerPayout.findMany({
      where: { trainerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Record a new payout to a trainer (admin action)
   */
  async recordPayout(
    trainerId: string,
    amount: number,
    method: string,
    notes?: string,
  ) {
    // Validate trainer exists
    const trainer = await this.prisma.user.findUnique({
      where: { id: trainerId },
    });

    if (!trainer) {
      throw new Error('Trainer not found');
    }

    // Get trainer's Whish number if available
    const trainerProfile = await this.prisma.trainerProfile.findUnique({
      where: { userId: trainerId },
    });

    return this.prisma.trainerPayout.create({
      data: {
        trainerId,
        amount,
        method: method.toLowerCase(),
        whishNumber: trainerProfile?.whatsappNumber,
        notes,
        status: 'pending',
      },
    });
  }

  /**
   * Mark a payout as paid (admin action)
   */
  async markPayoutAsPaid(payoutId: string, adminUserId: string, notes?: string) {
    const payout = await this.prisma.trainerPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status === 'paid') {
      throw new Error('Payout is already marked as paid');
    }

    return this.prisma.trainerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'paid',
        paidBy: adminUserId,
        paidAt: new Date(),
        notes: notes ? `${payout.notes || ''}\n${notes}`.trim() : payout.notes,
      },
    });
  }

  /**
   * Cancel a pending payout
   */
  async cancelPayout(payoutId: string) {
    const payout = await this.prisma.trainerPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status === 'paid') {
      throw new Error('Cannot cancel a paid payout');
    }

    return this.prisma.trainerPayout.delete({
      where: { id: payoutId },
    });
  }

  /**
   * Get platform-wide earnings summary (for admin)
   */
  async getPlatformEarningsSummary() {
    // Total approved payments
    const approvedPayments = await this.prisma.whishPayment.aggregate({
      where: { status: 'approved' },
      _sum: { amount: true },
      _count: true,
    });

    // Total payouts to trainers
    const paidPayouts = await this.prisma.trainerPayout.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
      _count: true,
    });

    const pendingPayouts = await this.prisma.trainerPayout.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
      _count: true,
    });

    const totalRevenue = approvedPayments._sum.amount || 0;
    const trainerShare = Math.round(totalRevenue * this.TRAINER_COMMISSION);
    const platformRevenue = totalRevenue - trainerShare;

    return {
      totalRevenue, // Total from clients
      trainerShare, // What trainers should get
      platformRevenue, // Platform's cut
      totalPaidToTrainers: paidPayouts._sum.amount || 0,
      pendingPayouts: pendingPayouts._sum.amount || 0,
      outstandingToTrainers: trainerShare - (paidPayouts._sum.amount || 0) - (pendingPayouts._sum.amount || 0),
      paymentCount: approvedPayments._count,
      payoutCount: paidPayouts._count,
    };
  }
}
