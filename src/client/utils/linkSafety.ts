/**
 * Link safety utilities for detecting potentially fraudulent or unsafe URLs.
 * Helps protect users from ticket scams, phishing, and fraudulent sellers.
 */

// Trusted ticket and event platforms
const TRUSTED_DOMAINS = [
  'ticketmaster.com',
  'livenation.com',
  'eventbrite.com',
  'axs.com',
  'seatgeek.com',
  'stubhub.com',
  'vividseats.com',
  'dice.fm',
  'do713.com',
  'meetup.com',
  'facebook.com',
  'instagram.com',
  'yelp.com',
  'google.com',
  'tripadvisor.com',
  'opentable.com',
  'resy.com',
  'houstonchronicle.com',
  'visithoustontexas.com',
  'houston.org',
  'discoverhouston.com',
  'nps.gov',
  'houstontx.gov',
];

// Patterns commonly found in scam/phishing URLs
const SUSPICIOUS_PATTERNS = [
  /ticketmaster[^.]*\.(com|net|org)/i,    // e.g. ticketmaster-deals.com
  /eventbrite[^.]*\.(com|net|org)/i,
  /stubhub[^.]*\.(com|net|org)/i,
  /ticket[s]?[-_]?(discount|cheap|deal|sale|buy|now|fast|official)/i,
  /cheap[-_]?ticket/i,
  /buy[-_]?ticket[-_]?(now|fast|here|online)/i,
  /\d{5,}.*ticket/i,                       // long number strings with "ticket"
  /free[-_]?ticket/i,
  /(confirm|verify|secure)[-_]?(payment|order|ticket)/i,
  /bit\.ly|tinyurl|t\.co|goo\.gl|shorturl/i,  // URL shorteners (can hide real destination)
];

// Known scam TLDs that are frequently abused
const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.club', '.work', '.click',
  '.link', '.buzz', '.gq', '.cf', '.tk', '.ml',
];

export interface LinkSafetyResult {
  isTrusted: boolean;
  isSuspicious: boolean;
  domain: string;
  warnings: string[];
}

/**
 * Analyze a URL for safety indicators.
 */
export function analyzeLinkSafety(url: string): LinkSafetyResult {
  const warnings: string[] = [];
  let domain = '';
  let isTrusted = false;
  let isSuspicious = false;

  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, '');

    // Check protocol
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      warnings.push('Unusual URL protocol detected');
      isSuspicious = true;
    }

    if (parsed.protocol === 'http:') {
      warnings.push('This site does not use a secure connection (HTTPS)');
    }

    // Check if domain is trusted
    isTrusted = TRUSTED_DOMAINS.some(
      (trusted) => domain === trusted || domain.endsWith('.' + trusted)
    );

    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(url)) {
        isSuspicious = true;
        warnings.push('URL contains patterns commonly associated with fraudulent ticket sites');
        break;
      }
    }

    // Check for suspicious TLDs
    for (const tld of SUSPICIOUS_TLDS) {
      if (domain.endsWith(tld)) {
        isSuspicious = true;
        warnings.push('This website uses a domain extension commonly associated with scam sites');
        break;
      }
    }

    // Check for lookalike domains (e.g. ticketmastér.com using unicode)
    if (/[^\x00-\x7F]/.test(domain)) {
      isSuspicious = true;
      warnings.push('This domain contains unusual characters that may indicate a lookalike site');
    }

    // Check for excessive subdomains (e.g. ticketmaster.secure.payment.scam.com)
    const subdomainCount = domain.split('.').length;
    if (subdomainCount > 3) {
      warnings.push('This URL has an unusually complex domain structure');
    }

  } catch {
    warnings.push('This URL could not be verified');
    isSuspicious = true;
  }

  return { isTrusted, isSuspicious, domain, warnings };
}

/**
 * Get a human-readable safety level for display.
 */
export function getSafetyLevel(result: LinkSafetyResult): 'trusted' | 'unknown' | 'warning' {
  if (result.isSuspicious) return 'warning';
  if (result.isTrusted) return 'trusted';
  return 'unknown';
}
