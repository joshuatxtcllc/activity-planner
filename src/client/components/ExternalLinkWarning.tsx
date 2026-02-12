import { useState, useCallback, useEffect } from 'react';
import { analyzeLinkSafety, getSafetyLevel, type LinkSafetyResult } from '../utils/linkSafety';

interface VerificationResult {
  verified: boolean;
  seller: {
    domain: string;
    name: string;
    hasGuarantee: boolean;
    guaranteeUrl?: string;
  } | null;
  officialPrice: {
    min: number | null;
    max: number | null;
    source: string;
  } | null;
  warnings: string[];
}

interface ExternalLinkWarningProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  eventTitle?: string;
  displayedPrice?: { min?: number; max?: number };
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * A wrapper component that shows a safety interstitial before navigating
 * to external URLs. Performs real-time seller verification and price comparison
 * against official sources to protect users from scams.
 */
export default function ExternalLinkWarning({
  href,
  children,
  className = '',
  eventTitle,
  displayedPrice,
}: ExternalLinkWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [safetyResult, setSafetyResult] = useState<LinkSafetyResult | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = analyzeLinkSafety(href);
    setSafetyResult(result);
    setShowWarning(true);
  }, [href]);

  // Fetch server-side verification when the modal opens
  useEffect(() => {
    if (!showWarning) return;

    setVerifying(true);
    fetch('/api/verify-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: href, eventTitle }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setVerification(data);
      })
      .catch(() => {
        // Silently fail - client-side checks are still active
      })
      .finally(() => setVerifying(false));
  }, [showWarning, href, eventTitle]);

  const handleProceed = useCallback(() => {
    window.open(href, '_blank', 'noopener,noreferrer');
    setShowWarning(false);
  }, [href]);

  const handleCancel = useCallback(() => {
    setShowWarning(false);
    setVerification(null);
  }, []);

  const safetyLevel = safetyResult ? getSafetyLevel(safetyResult) : 'unknown';
  const isVerifiedSeller = verification?.verified ?? false;
  const effectiveLevel = isVerifiedSeller ? 'trusted' : safetyLevel;

  // Detect price discrepancy
  const officialPrice = verification?.officialPrice;
  const hasPriceWarning =
    officialPrice?.min != null &&
    displayedPrice?.min != null &&
    displayedPrice.min > officialPrice.min * 1.5;

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        className={className}
        rel="noopener noreferrer"
      >
        {children}
      </a>

      {showWarning && safetyResult && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 ${
              effectiveLevel === 'trusted'
                ? 'bg-green-50 border-b border-green-200'
                : effectiveLevel === 'warning'
                ? 'bg-red-50 border-b border-red-200'
                : 'bg-yellow-50 border-b border-yellow-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {effectiveLevel === 'trusted' ? '✓' : effectiveLevel === 'warning' ? '!' : '?'}
                </span>
                <div>
                  <h3 className={`font-bold text-lg ${
                    effectiveLevel === 'trusted'
                      ? 'text-green-800'
                      : effectiveLevel === 'warning'
                      ? 'text-red-800'
                      : 'text-yellow-800'
                  }`}>
                    {effectiveLevel === 'trusted'
                      ? 'Verified Seller'
                      : effectiveLevel === 'warning'
                      ? 'Potential Safety Concern'
                      : 'Leaving Houston Events'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    You are about to visit: <strong className="break-all">{safetyResult.domain}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Server-side verification badge */}
              {verifying && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                  Verifying seller...
                </div>
              )}

              {isVerifiedSeller && verification?.seller && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="font-medium text-green-800 text-sm">
                      Verified: {verification.seller.name}
                    </span>
                  </div>
                  <p className="text-xs text-green-700 ml-6">
                    This is an authorized ticket seller recognized by Houston Events.
                  </p>
                  {verification.seller.hasGuarantee && (
                    <p className="text-xs text-green-700 ml-6 mt-1">
                      This seller offers a buyer guarantee policy.
                    </p>
                  )}
                </div>
              )}

              {/* Price Comparison */}
              {officialPrice && officialPrice.min != null && (
                <div className={`border rounded-lg p-3 ${
                  hasPriceWarning
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`font-medium text-sm mb-2 ${
                    hasPriceWarning ? 'text-orange-800' : 'text-gray-800'
                  }`}>
                    {hasPriceWarning ? 'Price Alert' : 'Official Price Reference'}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs block">Official ({officialPrice.source})</span>
                      <span className="font-semibold text-gray-900">
                        {formatCents(officialPrice.min)}
                        {officialPrice.max && officialPrice.max !== officialPrice.min
                          ? ` - ${formatCents(officialPrice.max)}`
                          : ''}
                      </span>
                    </div>
                    {displayedPrice?.min != null && (
                      <>
                        <span className="text-gray-400">vs</span>
                        <div>
                          <span className="text-gray-500 text-xs block">This listing</span>
                          <span className={`font-semibold ${hasPriceWarning ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatCents(displayedPrice.min)}
                            {displayedPrice.max && displayedPrice.max !== displayedPrice.min
                              ? ` - ${formatCents(displayedPrice.max)}`
                              : ''}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {hasPriceWarning && (
                    <p className="text-xs text-orange-700 mt-2">
                      This listing's price is significantly above the official face value.
                      Consider buying directly from the official source instead.
                    </p>
                  )}
                </div>
              )}

              {/* Warnings */}
              {(safetyResult.warnings.length > 0 || (verification?.warnings?.length ?? 0) > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-medium text-red-800 text-sm mb-2">Warnings:</p>
                  <ul className="space-y-1">
                    {safetyResult.warnings.map((warning, i) => (
                      <li key={`client-${i}`} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="mt-0.5">-</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                    {verification?.warnings?.map((warning, i) => (
                      <li key={`server-${i}`} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="mt-0.5">-</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Safety Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-800 text-sm mb-2">Ticket Purchase Safety Tips:</p>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">-</span>
                    <span>Only buy from the venue's official website or authorized sellers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">-</span>
                    <span>Compare prices across multiple sites before purchasing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">-</span>
                    <span>Use a credit card (not debit) for buyer protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">-</span>
                    <span>Be wary of prices significantly above or below face value</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">-</span>
                    <span>Check the URL carefully for misspellings or unusual domains</span>
                  </li>
                </ul>
              </div>

              {effectiveLevel === 'trusted' && !hasPriceWarning && (
                <p className="text-sm text-green-700">
                  This is a recognized event platform. Standard caution still applies when making purchases.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
              >
                Go Back
              </button>
              <button
                onClick={handleProceed}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm text-white ${
                  effectiveLevel === 'warning'
                    ? 'bg-red-600 hover:bg-red-700'
                    : effectiveLevel === 'trusted'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {effectiveLevel === 'warning' ? 'Proceed Anyway (Be Careful)' : 'Continue to Site'}
              </button>
            </div>

            {/* Footer link */}
            <div className="px-6 py-3 border-t text-center">
              <a
                href="/safety"
                className="text-xs text-indigo-600 hover:text-indigo-800"
                onClick={(e) => {
                  e.preventDefault();
                  setShowWarning(false);
                  window.location.href = '/safety';
                }}
              >
                Learn more about staying safe online
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
