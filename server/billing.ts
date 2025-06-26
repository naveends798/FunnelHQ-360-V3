import Stripe from "stripe";
import { BILLING_PLANS, BillingPlan } from "../shared/schema.js";

// Check if we're in development mode with placeholder keys
const isDevelopmentMode = process.env.NODE_ENV === 'development' && 
  (process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' || !process.env.STRIPE_SECRET_KEY);

// Initialize Stripe only if we have real keys
export const stripe = isDevelopmentMode ? null : new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// Stripe Product IDs mapping (you'll need to create these in your Stripe dashboard)
export const STRIPE_PRICE_IDS = {
  solo: process.env.STRIPE_SOLO_PRICE_ID || 'price_solo_placeholder',
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
};

export class BillingService {
  static async createCustomer(email: string, name: string, organizationId: number) {
    if (isDevelopmentMode) {
      // Return mock customer for development
      return {
        id: `cus_mock_${organizationId}_${Date.now()}`,
        email,
        name,
        metadata: {
          organizationId: organizationId.toString(),
        },
      };
    }

    const customer = await stripe!.customers.create({
      email,
      name,
      metadata: {
        organizationId: organizationId.toString(),
      },
    });

    return customer;
  }

  static async createSubscription(
    customerId: string,
    plan: BillingPlan,
    organizationId: number
  ) {
    if (isDevelopmentMode) {
      // Return mock subscription for development
      return {
        id: `sub_mock_${organizationId}_${Date.now()}`,
        customer: customerId,
        items: { data: [{ price: { id: STRIPE_PRICE_IDS[plan] } }] },
        metadata: {
          organizationId: organizationId.toString(),
          plan,
        },
        status: 'active',
      };
    }

    const priceId = STRIPE_PRICE_IDS[plan];
    
    const subscription = await stripe!.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        organizationId: organizationId.toString(),
        plan,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  }

  static async createCheckoutSession(
    customerId: string,
    plan: BillingPlan,
    organizationId: number,
    successUrl: string,
    cancelUrl: string
  ) {
    if (isDevelopmentMode) {
      // Return mock checkout session that redirects to success URL for development
      return {
        id: `cs_mock_${organizationId}_${Date.now()}`,
        url: `${successUrl}?session_id=cs_mock_${organizationId}&plan=${plan}`,
        customer: customerId,
        metadata: {
          organizationId: organizationId.toString(),
          plan,
        },
      };
    }

    const priceId = STRIPE_PRICE_IDS[plan];
    
    const session = await stripe!.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId: organizationId.toString(),
        plan,
      },
    });

    return session;
  }

  static async createPortalSession(customerId: string, returnUrl: string) {
    if (isDevelopmentMode) {
      // Return mock portal session that redirects back to return URL for development
      return {
        id: `bps_mock_${Date.now()}`,
        url: `${returnUrl}?portal=mock&customer=${customerId}`,
        customer: customerId,
      };
    }

    const session = await stripe!.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  }

  static async updateSubscription(subscriptionId: string, newPlan: BillingPlan) {
    if (isDevelopmentMode) {
      // Return mock updated subscription for development
      return {
        id: subscriptionId,
        items: { data: [{ id: 'si_mock', price: { id: STRIPE_PRICE_IDS[newPlan] } }] },
        metadata: {
          plan: newPlan,
        },
        status: 'active',
      };
    }

    const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
    const priceId = STRIPE_PRICE_IDS[newPlan];

    const updatedSubscription = await stripe!.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      metadata: {
        ...subscription.metadata,
        plan: newPlan,
      },
    });

    return updatedSubscription;
  }

  static async cancelSubscription(subscriptionId: string) {
    if (isDevelopmentMode) {
      // Return mock cancelled subscription for development
      return {
        id: subscriptionId,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      };
    }

    const subscription = await stripe!.subscriptions.cancel(subscriptionId);
    return subscription;
  }

  static async getInvoices(customerId: string) {
    if (isDevelopmentMode) {
      // Return mock invoices for development
      return {
        data: [
          {
            id: `in_mock_${Date.now()}`,
            customer: customerId,
            amount_paid: 2900, // $29.00 in cents
            created: Math.floor(Date.now() / 1000),
            status: 'paid',
            hosted_invoice_url: '#',
          }
        ],
        has_more: false,
      };
    }

    const invoices = await stripe!.invoices.list({
      customer: customerId,
      limit: 12,
    });

    return invoices;
  }

  static async getUpcomingInvoice(subscriptionId: string) {
    if (isDevelopmentMode) {
      // Return mock upcoming invoice for development
      return {
        id: `in_upcoming_mock_${Date.now()}`,
        subscription: subscriptionId,
        amount_due: 2900, // $29.00 in cents
        period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000), // 30 days from now
      };
    }

    const invoice = await stripe!.invoices.upcoming({
      subscription: subscriptionId,
    });

    return invoice;
  }

  static getPlanDetails(plan: BillingPlan) {
    return BILLING_PLANS[plan];
  }

  static calculateUsageLimits(plan: BillingPlan, currentUsage: any) {
    const planDetails = BILLING_PLANS[plan];
    const limits = planDetails.limits;

    return {
      projects: {
        current: currentUsage.projects || 0,
        limit: limits.projects === -1 ? 'unlimited' : limits.projects,
        percentage: limits.projects === -1 ? 0 : Math.min(100, (currentUsage.projects / limits.projects) * 100),
      },
      collaborators: {
        current: currentUsage.collaborators || 0,
        limit: limits.collaborators === -1 ? 'unlimited' : limits.collaborators,
        percentage: limits.collaborators === -1 ? 0 : Math.min(100, (currentUsage.collaborators / limits.collaborators) * 100),
      },
      storage: {
        current: currentUsage.storage || 0,
        limit: limits.storage === -1 ? 'unlimited' : limits.storage,
        percentage: limits.storage === -1 ? 0 : Math.min(100, (currentUsage.storage / limits.storage) * 100),
        currentReadable: this.formatBytes(currentUsage.storage || 0),
        limitReadable: limits.storage === -1 ? 'unlimited' : this.formatBytes(limits.storage),
      },
    };
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static isFeatureAvailable(plan: BillingPlan, feature: string): boolean {
    const planDetails = BILLING_PLANS[plan];
    return planDetails.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
  }

  static checkLimits(plan: BillingPlan, currentUsage: any): { 
    withinLimits: boolean; 
    exceeded: string[];
    warnings: string[];
  } {
    const limits = BILLING_PLANS[plan].limits;
    const exceeded: string[] = [];
    const warnings: string[] = [];

    // Check project limits
    if (limits.projects !== -1 && currentUsage.projects >= limits.projects) {
      exceeded.push('projects');
    } else if (limits.projects !== -1 && currentUsage.projects >= limits.projects * 0.8) {
      warnings.push('projects');
    }

    // Check team member limits
    if (limits.collaborators !== -1 && currentUsage.collaborators >= limits.collaborators) {
      exceeded.push('collaborators');
    } else if (limits.collaborators !== -1 && currentUsage.collaborators >= limits.collaborators * 0.8) {
      warnings.push('collaborators');
    }

    // Check storage limits
    if (limits.storage !== -1 && currentUsage.storage >= limits.storage) {
      exceeded.push('storage');
    } else if (limits.storage !== -1 && currentUsage.storage >= limits.storage * 0.8) {
      warnings.push('storage');
    }

    return {
      withinLimits: exceeded.length === 0,
      exceeded,
      warnings,
    };
  }
}