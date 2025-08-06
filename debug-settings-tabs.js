// Debug script for settings tabs
// Run this in browser console on the settings page

console.log('=== Settings Tab Debug ===');

// Check if tabs exist
const tabsList = document.querySelector('[role="tablist"]');
console.log('TabsList found:', !!tabsList);

if (tabsList) {
  const tabs = tabsList.querySelectorAll('[role="tab"]');
  console.log('Number of tabs found:', tabs.length);
  
  tabs.forEach((tab, index) => {
    console.log(`Tab ${index + 1}:`, {
      text: tab.textContent,
      value: tab.getAttribute('data-value') || tab.getAttribute('value'),
      visible: tab.offsetParent !== null,
      styles: window.getComputedStyle(tab).display
    });
  });
  
  // Check TabsList styles
  const styles = window.getComputedStyle(tabsList);
  console.log('\nTabsList styles:', {
    display: styles.display,
    overflow: styles.overflow,
    width: styles.width,
    flexWrap: styles.flexWrap
  });
}

// Check localStorage
console.log('\nFeature flag status:');
console.log('enable-enhanced-ocr:', localStorage.getItem('enable-enhanced-ocr'));

// Check current URL
console.log('\nCurrent URL:', window.location.href);
console.log('URL params:', new URLSearchParams(window.location.search).toString());