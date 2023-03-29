const admin = require('firebase-admin')

// Initialize firebase admin SDK
admin.initializeApp({
  credential: admin.credential.cert(process.env.path_to_credential),
  storageBucket: 'gs://facebook-9186c.appspot.com'
})
// Cloud storage
const bucket  = admin.storage().bucket();

module.exports = {
  bucket 
}
