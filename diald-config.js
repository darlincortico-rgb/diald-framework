/* Public settings. The publishable key is designed to be public;
   access is controlled by Row Level Security in Supabase. */
window.DIALD_CONFIG = {
  supabaseUrl: 'https://sljdpnndflfyilsbpemb.supabase.co',
  supabaseKey: 'sb_publishable_JKcMKuefLcN7TAXvWHKNGg_KsXvVXNQ',
  // Provisional reference criterion: a dimension (Oral or Literacy) is "High"
  // when BOTH of its domains are at or above this level. Teachers can change it.
  defaultHighLevel: 3,
  maxLevel: 5, // LAS Links reports levels 1–5
  googleSignIn: false, // turn on after Google is configured in Supabase → Sign In / Providers
  contactEmail: '', // TODO: Darlin chooses the public contact email
  // Feedback bubble: the Formspree form ID (the part after formspree.io/f/). Empty = bubble hidden.
  // Feedback bubble. Easiest: paste the Google Form's share link here (forms.gle/... or docs.google.com/forms/d/e/.../viewform).
  // "Explain with AI": the Cloudflare Worker address (https://....workers.dev). Empty = button hidden.
  aiUrl: '',
  feedbackFormLink: 'https://docs.google.com/forms/d/e/1FAIpQLSccLZ_Z4_INt8Iufp0QTEe8QlG7pDyboii8mQSpaEqtilyprQ/viewform',
  // Other options (used only when feedbackFormLink is empty): a Formspree form ID ...
  feedbackFormId: '',
  // Or a Google Form (free, no monthly limit): the form's formResponse address and the entry number of each question.
  feedbackGoogleForm: { action: '', fields: { type: '', message: '', email: '', page: '' } }
};
