import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types/jwt-payload';
import Stripe from 'stripe';

class CreatePlanDto {
  name: string;
  description?: string;
  price: number; // in cents
  interval: string; // month, week, one_time
  duration?: number; // weeks for fixed programs
}

class UpdatePlanDto {
  name?: string;
  description?: string;
  price?: number;
  active?: boolean;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // =============================================
  // STRIPE CONNECT (Trainer)
  // =============================================

  // Create Stripe Connect account
  @Post('stripe-account')
  @UseGuards(JwtAuthGuard)
  createStripeAccount(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.createStripeAccount(
      req.user.userId,
      req.user.email,
    );
  }

  // Get onboarding link
  @Post('onboarding-link')
  @UseGuards(JwtAuthGuard)
  getOnboardingLink(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { returnUrl: string; refreshUrl: string },
  ) {
    return this.paymentsService.getOnboardingLink(
      req.user.userId,
      dto.returnUrl,
      dto.refreshUrl,
    );
  }

  // Get Stripe account status
  @Get('stripe-account/status')
  @UseGuards(JwtAuthGuard)
  getStripeAccountStatus(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.getStripeAccountStatus(req.user.userId);
  }

  // Get Stripe dashboard link
  @Get('stripe-dashboard')
  @UseGuards(JwtAuthGuard)
  getStripeDashboardLink(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.getStripeDashboardLink(req.user.userId);
  }

  // =============================================
  // PRICING PLANS (Trainer)
  // =============================================

  // Create pricing plan
  @Post('plans')
  @UseGuards(JwtAuthGuard)
  createPlan(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreatePlanDto,
  ) {
    return this.paymentsService.createPricingPlan(req.user.userId, dto);
  }

  // Get my pricing plans
  @Get('plans')
  @UseGuards(JwtAuthGuard)
  getMyPlans(
    @Request() req: AuthenticatedRequest,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.paymentsService.getTrainerPlans(
      req.user.userId,
      includeInactive === 'true',
    );
  }

  // Get trainer's public plans (for clients)
  @Get('plans/trainer/:trainerId')
  getTrainerPublicPlans(@Param('trainerId') trainerId: string) {
    return this.paymentsService.getPublicTrainerPlans(trainerId);
  }

  // Update pricing plan
  @Put('plans/:id')
  @UseGuards(JwtAuthGuard)
  updatePlan(
    @Request() req: AuthenticatedRequest,
    @Param('id') planId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.paymentsService.updatePricingPlan(planId, req.user.userId, dto);
  }

  // Delete pricing plan
  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard)
  deletePlan(
    @Request() req: AuthenticatedRequest,
    @Param('id') planId: string,
  ) {
    return this.paymentsService.deletePricingPlan(planId, req.user.userId);
  }

  // =============================================
  // SUBSCRIPTIONS
  // =============================================

  // Get my subscriptions (client)
  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  getMySubscriptions(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.getClientSubscriptions(req.user.userId);
  }

  // Get my subscribers (trainer)
  @Get('subscribers')
  @UseGuards(JwtAuthGuard)
  getMySubscribers(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.getTrainerSubscribers(req.user.userId);
  }

  // Cancel subscription
  @Post('subscriptions/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelSubscription(
    @Request() req: AuthenticatedRequest,
    @Param('id') subscriptionId: string,
  ) {
    return this.paymentsService.cancelSubscription(
      subscriptionId,
      req.user.userId,
    );
  }

  // =============================================
  // PAYMENTS
  // =============================================

  // Create payment intent
  @Post('payment-intent')
  @UseGuards(JwtAuthGuard)
  createPaymentIntent(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { planId: string },
  ) {
    return this.paymentsService.createPaymentIntent(req.user.userId, dto.planId);
  }

  // Confirm payment
  @Post('confirm-payment')
  @UseGuards(JwtAuthGuard)
  confirmPayment(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { paymentIntentId: string; planId: string },
  ) {
    return this.paymentsService.confirmPayment(
      dto.paymentIntentId,
      req.user.userId,
      dto.planId,
    );
  }

  // Get payment history
  @Get('subscriptions/:id/payments')
  @UseGuards(JwtAuthGuard)
  getPaymentHistory(
    @Request() req: AuthenticatedRequest,
    @Param('id') subscriptionId: string,
  ) {
    return this.paymentsService.getPaymentHistory(
      subscriptionId,
      req.user.userId,
    );
  }

  // =============================================
  // EARNINGS & PAYOUTS (Trainer)
  // =============================================

  // Get earnings summary
  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  getEarnings(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.getTrainerEarnings(req.user.userId);
  }

  // Get payout history
  @Get('payouts')
  @UseGuards(JwtAuthGuard)
  getPayouts(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.getPayoutHistory(req.user.userId);
  }

  // =============================================
  // WEBHOOK
  // =============================================

  // Stripe webhook endpoint (no auth guard)
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return { received: true };
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2023-10-16',
      });

      const event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        signature,
        webhookSecret,
      );

      await this.paymentsService.handleWebhook(event);

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      return { received: false, error: error.message };
    }
  }
}
