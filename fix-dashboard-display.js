// Script to debug and fix dashboard display issues

// Test API endpoints
async function testAPIs() {
  console.log('Testing API endpoints...\n');
  
  // Test Python API
  try {
    const pythonResponse = await fetch('http://localhost:5001/api/media-stats');
    const pythonData = await pythonResponse.json();
    console.log('Python API (port 5001):', pythonData);
  } catch (error) {
    console.error('Python API error:', error.message);
  }
  
  // Test Web Interface API
  try {
    const webResponse = await fetch('http://localhost:3005/api/stats');
    const webData = await webResponse.json();
    console.log('\nWeb Interface API (port 3005):', webData);
  } catch (error) {
    console.error('Web Interface API error:', error.message);
  }
  
  // Test file history
  try {
    const historyResponse = await fetch('http://localhost:3005/api/file-history');
    const historyData = await historyResponse.json();
    console.log('\nFile History:', {
      total_files: historyData.files?.length || 0,
      success: historyData.success
    });
  } catch (error) {
    console.error('File History API error:', error.message);
  }
}

// Run tests
console.log('Media Processor Dashboard Diagnostics');
console.log('=====================================\n');
testAPIs();