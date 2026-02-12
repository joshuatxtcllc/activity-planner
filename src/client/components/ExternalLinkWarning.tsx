import { useState, useCallback } from 'react';
import { analyzeLinkSafety, getSafetyLevel, type LinkSafetyResult } from '../utils/linkSafety';

interface ExternalLinkWarningProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A wrapper component that shows a safety interstitial before navigating
 * to external URLs. Warns users about potential scam/phishing sites and
 * provides safety tips for online ticket purchases.
 */
export default function ExternalLinkWarning({ href, children, className = '' }: ExternalLinkWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [safetyResult, setSafetyResult] = useState<LinkSafetyResult | null>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = analyzeLinkSafety(href);
    setSafetyResult(result);
    setShowWarning(true);
  }, [href]);

  const handleProceed = useCallback(() => {
    window.open(href, '_blank', 'noopener,noreferrer');
    setShowWarning(false);
  }, [href]);

  const handleCancel = useCallback(() => {
    setShowWarning(false);
  }, []);

  const safetyLevel = safetyResult ? getSafetyLevel(safetyResult) : 'unknown';

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
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 ${
              safetyLevel === 'trusted'
                ? 'bg-green-50 border-b border-green-200'
                : safetyLevel === 'warning'
                ? 'bg-red-50 border-b border-red-200'
                : 'bg-yellow-50 border-b border-yellow-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {safetyLevel === 'trusted' ? '✓' : safetyLevel === 'warning' ? '!' : '?'}
                </span>
                <div>
                  <h3 className={`font-bold text-lg ${
                    safetyLevel === 'trusted'
                      ? 'text-green-800'
                      : safetyLevel === 'warning'
                      ? 'text-red-800'
                      : 'text-yellow-800'
                  }`}>
                    {safetyLevel === 'trusted'
                      ? 'Recognized Website'
                      : safetyLevel === 'warning'
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
              {/* Warnings */}
              {safetyResult.warnings.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-medium text-red-800 text-sm mb-2">Warnings:</p>
                  <ul className="space-y-1">
                    {safetyResult.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2">
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

              {safetyLevel === 'trusted' && (
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
                  safetyLevel === 'warning'
                    ? 'bg-red-600 hover:bg-red-700'
                    : safetyLevel === 'trusted'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {safetyLevel === 'warning' ? 'Proceed Anyway (Be Careful)' : 'Continue to Site'}
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
