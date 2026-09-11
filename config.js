/* The two addresses the page needs. Only the teacher changes these.
   googleClientId  the same Google Client ID the labs use: the site's address is already one
                   of its authorised origins, so sign-in works here as it does there.
   scriptUrl       the /exec address of the society's own Apps Script (apps-script/Code.gs),
                   deployed as a web app with access "Anyone". Use the plain
                   script.google.com/macros/s/… form, not the /a/macros/<school>/s/… one the
                   editor shows a school account: that one makes a visitor sign in to the school
                   first, and this page asks for the register before anybody has signed in.
                   Leave it empty and the page still works, minus the sign-in, the list and the
                   votes, and says so. */
window.VETSOC_CONFIG = {
  googleClientId: '749068441640-jgh9s0rbg8ed9hl14mtv6kdhg5jg6ddf.apps.googleusercontent.com',
  scriptUrl: 'https://script.google.com/macros/s/AKfycbylCNbrlJT73aR2C9AhkTGTCwHmyjOwert5n81XiegKGQBa67lPRFj9YHeLszBSA8VlVA/exec'
};
