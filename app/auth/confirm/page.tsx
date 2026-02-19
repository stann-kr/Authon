"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Alert from "@/components/Alert";
import { BRAND_NAME } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const processedHash = useRef<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const tokenHash = queryParams.get("token_hash");
      const type = queryParams.get("type") || "signup";

      if (!tokenHash) {
        setError("Verification link is missing a valid token.");
        setIsLoading(false);
        return;
      }

      // Prevent double execution
      if (processedHash.current === tokenHash) return;
      processedHash.current = tokenHash;

      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });

        if (verifyError) {
          setError(verifyError.message);
        } else {
          setSuccess(true);
          // Redirect to login after a short delay
          setTimeout(() => {
            router.push("/auth/login");
          }, 3000);
        }
      } catch (err) {
        setError("An unexpected error occurred during verification.");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 bg-white"></div>
            <div className="w-2 h-2 bg-white"></div>
            <div className="w-2 h-2 bg-white"></div>
          </div>
          <h1 className="font-mono text-xl tracking-wider text-white uppercase mb-2">
            {BRAND_NAME}
          </h1>
          <p className="text-gray-400 font-mono text-xs tracking-widest uppercase">
            EMAIL VERIFICATION
          </p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 p-8">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <p className="font-mono text-xs text-gray-400 tracking-wider">
                VERIFYING YOUR ACCOUNT...
              </p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="w-12 h-12 border border-green-500 flex items-center justify-center mx-auto">
                <i className="ri-check-line text-green-500 text-2xl"></i>
              </div>
              <h2 className="font-mono text-lg text-white uppercase tracking-wider">
                VERIFIED
              </h2>
              <p className="text-gray-400 font-mono text-xs tracking-wider">
                Your email has been successfully confirmed. Redirecting to
                login...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-12 h-12 border border-red-500 flex items-center justify-center mx-auto">
                <i className="ri-close-line text-red-500 text-2xl"></i>
              </div>
              <Alert type="error" message={error || "Verification failed."} />
              <button
                onClick={() => router.push("/auth/login")}
                className="w-full bg-white text-black py-3 font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors"
              >
                GO TO LOGIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
