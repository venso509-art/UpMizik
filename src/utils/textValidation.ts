/**
 * textValidation.ts
 * Validation utility to prevent artists and users from posting phone numbers,
 * excess consecutive digits, or contact numbers in bios, posts, comments, influences, etc.
 * 
 * Rule: Maximum 4 consecutive digits allowed (e.g., years like 1804, 2024, 2026, track numbers).
 * 5+ consecutive digits or telephone digit groupings are strictly blocked.
 */

export const RESTRICTED_DIGITS_ERROR_MESSAGE =
  'Pou sekirite ak règleman UpMizik, ou pa gen dwa mete nimewo telefòn oswa plis pase 4 chif swit an swit (egz: ane tankou 2024 otorize, men nimewo telefòn oswa seri 5 chif entèdi).';

/**
 * Checks if a string contains 5 or more consecutive digits or phone number patterns.
 */
export function hasRestrictedPhoneOrDigits(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const text = input.trim();
  if (!text) return false;

  // 1. Direct 5+ consecutive digits with no separator (e.g. 12345, 50937123456)
  if (/\d{5,}/.test(text)) {
    return true;
  }

  // 2. Phone number patterns with separators (spaces, dashes, dots, parentheses, plus)
  // Check for clusters of 5 or more digits separated ONLY by phone-like symbols (whitespace, +, -, ., (, ), /)
  const phoneDigitClusters = text.match(/(?:\+?\d[+\s\-()./]*){5,}/g);
  if (phoneDigitClusters) {
    for (const cluster of phoneDigitClusters) {
      // Allow legitimate year ranges strictly formatted as YYYY-YYYY or YYYY/YYYY (e.g. 2020-2024, 1998/2002)
      const isLegitYearRange = /^(?:19|20)\d{2}\s*[-/]\s*(?:19|20)\d{2}$/.test(cluster.trim());
      if (!isLegitYearRange) {
        // Count total digits inside this cluster
        const digitCount = (cluster.match(/\d/g) || []).length;
        if (digitCount >= 5) {
          return true;
        }
      }
    }
  }

  // 3. Specific Haitian & International telephone prefixes followed by digits
  const phoneKeywords = /(?:whatsapp|tel|telefòn|telefon|phone|rele|kontak|contact|moncash|natcash|call|msg|sms)[\s:]*[\d\s\-().+]{5,}/i;
  if (phoneKeywords.test(text)) {
    return true;
  }

  return false;
}

/**
 * Validates text and returns { isValid, error }
 */
export function validateRestrictedDigits(
  input: string,
  fieldLabel?: string
): { isValid: boolean; error?: string } {
  if (hasRestrictedPhoneOrDigits(input)) {
    const prefix = fieldLabel ? `Nan ${fieldLabel}: ` : '';
    return {
      isValid: false,
      error: `${prefix}${RESTRICTED_DIGITS_ERROR_MESSAGE}`
    };
  }
  return { isValid: true };
}

/**
 * Sanitizes live input if desired, preventing more than 4 consecutive digits
 */
export function sanitizeLiveInputDigits(input: string): string {
  if (!input) return '';
  // Replace 5+ consecutive digits with max 4
  return input.replace(/(\d{4})\d+/g, '$1');
}
