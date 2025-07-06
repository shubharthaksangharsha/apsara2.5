// services/google/gmail/aliases.js
/**
 * Email aliases mapping friendly names to email addresses
 */
export const emailAliases = {
    'me': 'shubharthaksangharsha@gmail.com',
    'myself': 'shubharthaksangharsha@gmail.com',
    'bro': 'siddhant3s@gmail.com',
    'bhaiya': 'siddhant3s@gmail.com',
    'gf': 'pranchal018@gmail.com',
    'wife': 'pranchal018@gmail.com',
    'baby': 'pranchal018@gmail.com',
    'love': 'pranchal018@gmail.com',
    'mom': 'usharani20jan@gmail.com',
    'mummy': 'usharani20jan@gmail.com',
    'maa': 'usharani20jan@gmail.com',
    'dad': 'doctorshersingh@gmail.com',
    'papa': 'doctorshersingh@gmail.com',
  };
  
  /**
   * Helper to resolve alias or return original if not an alias or already email-like
   * @param {string} aliasOrEmail - The email alias or direct email address
   * @returns {string|null} - Resolved email address or null if invalid
   */
  export function resolveEmailAlias(aliasOrEmail) {
      const lowerCaseInput = aliasOrEmail.toLowerCase().trim();
      if (emailAliases[lowerCaseInput]) {
          console.log(`[Alias Resolved] "${aliasOrEmail}" -> "${emailAliases[lowerCaseInput]}"`);
          return emailAliases[lowerCaseInput];
      }
      // Basic check if it looks like an email already
      if (lowerCaseInput.includes('@') && lowerCaseInput.includes('.')) {
          return aliasOrEmail.trim(); // Return original if it looks like an email
      }
      // If it's not an alias and doesn't look like an email, flag it.
      console.warn(`[Alias Not Found/Invalid] Input "${aliasOrEmail}" is not a known alias or a valid email format.`);
      return null;
  }