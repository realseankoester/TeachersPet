try {
  const router = require('react-router-dom');
  console.log('Successfully required react-router-dom. Version:', router.version);
  // If router.version is undefined, it still loaded, but might be an older module format
  if (!router.version) {
      console.log('Router object keys:', Object.keys(router));
  }
} catch (e) {
  console.error('Failed to require react-router-dom:', e.message);
  console.error('Error stack:', e.stack); // Get more details
}