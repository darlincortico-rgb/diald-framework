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
  contactEmail: '' // TODO: Darlin chooses the public contact email
};
