"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ArrowRight, Crown } from "lucide-react";

export interface PricingFeature {
    name: string;
    highlight?: boolean;
    included: boolean;
}

export interface PricingTier {
    name: string;
    price: number;
    interval?: string;
    description: string;
    features: PricingFeature[];
    highlight?: boolean;
    cta?: {
        text: string;
        href?: string;
        onClick?: () => void;
        planKey?: string;
        isCurrentPlan?: boolean;
    };
}

export interface PricingCardsProps extends React.HTMLAttributes<HTMLDivElement> {
    tiers: PricingTier[];
    containerClassName?: string;
    cardClassName?: string;
    sectionClassName?: string;
}

export function PricingCards({
    tiers,
    className,
    containerClassName,
    cardClassName,
    sectionClassName,
    ...props
}: PricingCardsProps) {
    return (
        <section
            className={cn(
                "text-white",
                "py-12",
                sectionClassName
            )}
        >
            <div className={cn("w-full max-w-5xl mx-auto", containerClassName)} {...props}>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", className)}>
                    {tiers.map((tier) => (
                        <div
                            key={tier.name}
                            className={cn(
                                "relative group",
                                "rounded-2xl transition-all duration-500",
                                "glass border-white/10",
                                "hover:border-white/20",
                                "hover:shadow-[0_8px_40px_-12px_rgba(255,255,255,0.1)]",
                                tier.highlight && "ring-2 ring-purple-500 border-purple-500/50 bg-purple-500/5",
                                cardClassName
                            )}
                        >
                            <div className="p-10 flex flex-col h-full">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg uppercase tracking-wider font-medium text-white">
                                            {tier.name}
                                        </h3>
                                        {tier.highlight && (
                                            <div className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                                                CURRENT PLAN
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-light text-white">
                                            ${tier.price}
                                        </span>
                                        <span className="text-sm text-slate-400">
                                            {tier.interval || "one-time"}
                                        </span>
                                    </div>
                                    <p className="text-sm pb-6 border-b text-slate-400 border-white/10">
                                        {tier.description}
                                    </p>
                                </div>

                                <div className="mt-8 space-y-4 flex-grow">
                                    {tier.features.map((feature) => (
                                        <div
                                            key={feature.name}
                                            className="flex items-center gap-3"
                                        >
                                            <div className={cn(
                                                "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                                                feature.included
                                                    ? "text-green-400"
                                                    : "text-slate-500"
                                            )}>
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm text-slate-300">
                                                {feature.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {tier.cta && (
                                    <div className="mt-8">
                                        <Button
                                            className={cn(
                                                "w-full h-12 group relative",
                                                tier.cta.isCurrentPlan
                                                    ? "bg-purple-600/20 border-purple-500/30 text-purple-300 cursor-default"
                                                    : tier.cta.planKey === 'pro'
                                                    ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0"
                                                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20",
                                                "transition-all duration-300"
                                            )}
                                            onClick={tier.cta.onClick}
                                            disabled={tier.cta.isCurrentPlan}
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2 font-medium tracking-wide">
                                                {tier.cta.isCurrentPlan && <Crown className="w-4 h-4" />}
                                                {tier.cta.text}
                                            </span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}