import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // =============================================
  // STRIPE CONNECT (Trainer Onboarding)
  // =============================================

  // Create Stripe Connect account for trainer
  async createStripeAccount(userId: string, email: string) {
    // Check if account already exists
    const existing = await this.prisma.stripeAccount.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    // Create Express account on Stripe
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });

    // Save to database
    return this.prisma.stripeAccount.create({
      data: {
        userId,
        stripeAccountId: account.id,
        status: 'pending',
      },
    });
  }

  // Get Stripe Connect onboarding link
  async getOnboardingLink(userId: string, returnUrl: string, refreshUrl: string) {
    const stripeAccount = await this.prisma.stripeAccount.findUnique({
      where: { userId },
    });

    if (!stripeAccount) {
      throw new NotFoundException('Stripe account not found. Please create one first.');
    }

    const link = await stripe.accountLinks.create({
      account: stripeAccount.stripeAccountId,
      type: 'account_onboarding',
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });

    return { url: link.url };
  }

  // Get Stripe account status
  async getStripeAccountStatus(userId: string) {
    const stripeAccount = await this.prisma.stripeAccount.findUnique({
      where: { userId },
    });

    if (!stripeAccount) {
      return { hasAccount: false };
    }

    // Fetch latest status from Stripe
    const account = await stripe.accounts.retrieve(stripeAccount.stripeAccountId);

    // Update local record
    await this.prisma.stripeAccount.update({
      where: { userId },
      data: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        status: account.details_submitted ? 'active' : 'pending',
      },
    });

    return {
      hasAccount: true,
      stripeAccountId: stripeAccount.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      status: account.details_submitted ? 'active' : 'pending',
    };
  }

  // Get Stripe dashboard link for trainer
  async getStripeDashboardLink(userId: string) {
    const stripeAccount = await this.prisma.stripeAccount.findUnique({
      where: { userId },
    });

    if (!stripeAccount) {
      throw new NotFoundException('Stripe account not found');
    }

    const loginLink = await stripe.accounts.createLoginLink(
      stripeAccount.stripeAccountId,
    );

    return { url: loginLink.url };
  }

  // =============================================
  // PRICING PLANS
  // =============================================

  // Create pricing plan
  async createPricingPlan(
    trainerId: string,
    dto: {
      name: string;
      description?: string;
      price: number;
      interval: string;
      duration?: number;
    },
  ) {
    return this.prisma.pricingPlan.create({
      data: {
        trainerId,
        name: dto.name,
        description: dto.description,
        price: dto.price, // Already in cents
        interval: dto.interval,
        duration: dto.duration,
      },
    });
  }

  // Update pricing plan
  async updatePricingPlan(
    planId: string,
    trainerId: string,
    dto: {
      name?: string;
      description?: string;
      price?: number;
      active?: boolean;
    },
  ) {
    const plan = await this.prisma.pricingPlan.findFirst({
      where: { id: planId, trainerId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return this.prisma.pricingPlan.update({
      where: { id: planId },
      data: dto,
    });
  }

  // Delete pricing plan
  async deletePricingPlan(planId: string, trainerId: string) {
    const plan = await this.prisma.pricingPlan.findFirst({
      where: { id: planId, trainerId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Soft delete by setting inactive
    return this.prisma.pricingPlan.update({
      where: { id: planId },
      data: { active: false },
    });
  }

  // Get trainer's pricing plans
  async getTrainerPlans(trainerId: string, includeInactive = false) {
    return this.prisma.pricingPlan.findMany({
      where: {
        trainerId,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get public pricing plans for a trainer (for clients)
  async getPublicTrainerPlans(trainerId: string) {
    return this.prisma.pricingPlan.findMany({
      where: { trainerId, active: true },
      orderBy: { price: 'asc' },
    });
  }

  // =============================================
  // SUBSCRIPTIONS
  // =============================================

  // Create subscription (after payment succeeds)
  async createSubscription(
    clientId: string,
    planId: string,
    stripeSubId?: string,
    stripeCustomerId?: string,
  ) {
    const plan = await this.prisma.pricingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Calculate end date for fixed-duration plans
    let endDate: Date | null = null;
    if (plan.duration && plan.interval === 'one_time') {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration * 7); // weeks to days
    }

    return this.prisma.stripeSubscription.create({
      data: {
        clientId,
        trainerId: plan.trainerId,
        planId,
        stripeSubId,
        stripeCustomerId,
        status: 'active',
        startDate: new Date(),
        endDate,
      },
      include: {
        plan: true,
        trainer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, userId: string) {
    const subscription = await this.prisma.stripeSubscription.findFirst({
      where: {
        id: subscriptionId,
        OR: [{ clientId: userId }, { trainerId: userId }],
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Cancel on Stripe if it's a recurring subscription
    if (subscription.stripeSubId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubId);
      } catch (error) {
        console.error('Error canceling Stripe subscription:', error);
      }
    }

    return this.prisma.stripeSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
      },
    });
  }

  // Get client's subscriptions
  async getClientSubscriptions(clientId: string) {
    return this.prisma.stripeSubscription.findMany({
      where: { clientId },
      include: {
        plan: true,
        trainer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get trainer's subscribers
  async getTrainerSubscribers(trainerId: string) {
    return this.prisma.stripeSubscription.findMany({
      where: { trainerId, status: 'active' },
      include: {
        plan: true,
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =============================================
  // PAYMENTS
  // =============================================

  // Create payment intent for one-time payment
  async createPaymentIntent(clientId: string, planId: string) {
    const plan = await this.prisma.pricingPlan.findUnique({
      where: { id: planId },
      include: {
        trainer: {
          include: {
            stripeAccount: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (!plan.trainer.stripeAccount?.stripeAccountId) {
      throw new BadRequestException('Trainer has not set up payments');
    }

    // Calculate platform fee (e.g., 10%)
    const platformFee = Math.round(plan.price * 0.10);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price,
      currency: plan.currency,
      metadata: {
        planId,
        clientId,
        trainerId: plan.trainerId,
      },
      // Transfer to trainer's connected account minus platform fee
      transfer_data: {
        destination: plan.trainer.stripeAccount.stripeAccountId,
      },
      application_fee_amount: platformFee,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: plan.price,
      currency: plan.currency,
    };
  }

  // Confirm payment and create subscription
  async confirmPayment(
    paymentIntentId: string,
    clientId: string,
    planId: string,
  ) {
    // Retrieve payment intent with latest_charge expanded to get receipt URL
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not completed');
    }

    // Create subscription
    const subscription = await this.createSubscription(clientId, planId);

    // Get receipt URL from the latest charge
    const latestCharge = paymentIntent.latest_charge as Stripe.Charge | null;
    const receiptUrl = latestCharge?.receipt_url || null;

    // Log payment
    await this.prisma.stripePayment.create({
      data: {
        subscriptionId: subscription.id,
        stripePaymentId: paymentIntentId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'succeeded',
        receiptUrl,
      },
    });

    return subscription;
  }

  // Get payment history for a subscription
  async getPaymentHistory(subscriptionId: string, userId: string) {
    // Verify user has access to this subscription
    const subscription = await this.prisma.stripeSubscription.findFirst({
      where: {
        id: subscriptionId,
        OR: [{ clientId: userId }, { trainerId: userId }],
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.stripePayment.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =============================================
  // EARNINGS & PAYOUTS (Trainer)
  // =============================================

  // Get trainer earnings summary
  async getTrainerEarnings(trainerId: string) {
    const payments = await this.prisma.stripePayment.findMany({
      where: {
        subscription: {
          trainerId,
        },
        status: 'succeeded',
      },
    });

    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);
    const platformFee = Math.round(totalEarnings * 0.10); // 10% platform fee
    const netEarnings = totalEarnings - platformFee;

    // Get this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthPayments = payments.filter(
      (p) => new Date(p.createdAt) >= startOfMonth,
    );
    const thisMonthEarnings = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

    // Get active subscribers count
    const activeSubscribers = await this.prisma.stripeSubscription.count({
      where: { trainerId, status: 'active' },
    });

    return {
      totalEarnings,
      platformFee,
      netEarnings,
      thisMonthEarnings: Math.round(thisMonthEarnings * 0.90), // Net
      paymentCount: payments.length,
      activeSubscribers,
    };
  }

  // Get payout history
  async getPayoutHistory(trainerId: string) {
    return this.prisma.payout.findMany({
      where: { trainerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =============================================
  // WEBHOOKS
  // =============================================

  // Handle Stripe webhook events
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        break;

      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        await this.prisma.stripeAccount.updateMany({
          where: { stripeAccountId: account.id },
          data: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            status: account.details_submitted ? 'active' : 'pending',
          },
        });
        break;

      case 'payout.paid':
        const payout = event.data.object as Stripe.Payout;
        // Log payout if it's for one of our connected accounts
        console.log('Payout paid:', payout.id);
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await this.prisma.stripeSubscription.updateMany({
          where: { stripeSubId: subscription.id },
          data: {
            status: 'canceled',
            canceledAt: new Date(),
          },
        });
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}
