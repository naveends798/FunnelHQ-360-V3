import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, Mail, Download } from "lucide-react";
import { useLocation } from "wouter";

export default function OnboardingSuccessPage() {
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-xl p-12"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Thank You!
            </h1>
            <p className="text-xl text-slate-300 mb-2">
              Your onboarding form has been submitted successfully.
            </p>
            <p className="text-slate-400">
              We've received all your information and will review it shortly.
            </p>
          </motion.div>

          {/* What's Next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-semibold text-white mb-6">What's Next?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Email Confirmation</h3>
                <p className="text-slate-400 text-sm">
                  You'll receive a confirmation email within the next few minutes.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Review Process</h3>
                <p className="text-slate-400 text-sm">
                  Our team will review your responses and prepare a project proposal.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Follow-up Call</h3>
                <p className="text-slate-400 text-sm">
                  We'll schedule a call to discuss your project within 2-3 business days.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-3">Need Help?</h3>
            <p className="text-slate-300 text-sm mb-4">
              If you have any questions or need to update your information, please don't hesitate to reach out.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="glass border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
              <Button
                variant="outline"
                className="glass border-white/20 text-white hover:bg-white/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </Button>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            <Button
              onClick={() => setLocation('/')}
              className="w-full bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              Return to Dashboard
            </Button>
            
            <p className="text-slate-500 text-sm">
              Reference ID: ONB-{Date.now().toString().slice(-6)}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}