/* The two addresses the page needs. Only the teacher changes these.
   googleClientId  the same Google Client ID the labs use: the site's address is already one
                   of its authorised origins, so sign-in works here as it does there.
   scriptUrl       the /exec address of the society's own Apps Script (apps-script/Code.gs),
                   deployed as a web app. Leave it empty and the page still works, minus the
                   sign-in, the list and the votes, and says so. */
window.VETSOC_CONFIG = {
  googleClientId: '749068441640-jgh9s0rbg8ed9hl14mtv6kdhg5jg6ddf.apps.googleusercontent.com',
  scriptUrl: ''
};
