const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    if (response.url().includes('api') && response.request().method() !== 'OPTIONS') {
      try {
        const text = await response.text();
        if (text.includes('05:') || text.includes('schedule') || text.includes('jadwal')) {
          console.log('FOUND SCHEDULE API:', response.url());
          require('fs').writeFileSync('api-response.json', text);
        }
      } catch (e) {}
    }
  });
  
  console.log("Navigating...");
  await page.goto('https://jakartamrt.co.id/jadwal-keberangkatan', { waitUntil: 'networkidle2' });
  
  console.log("Clicking dropdown...");
  await page.click('.MuiSelect-select');
  await new Promise(r => setTimeout(r, 500));
  
  console.log("Selecting station (ASEAN)...");
  const items = await page.$$('.MuiMenuItem-root');
  for (const item of items) {
    const text = await page.evaluate(el => el.textContent, item);
    if (text.includes('ASEAN')) {
      await item.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  
  console.log("Clicking Lihat Jadwal...");
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Lihat Jadwal')) {
      await b.click();
      break;
    }
  }
  
  console.log("Waiting for data...");
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  console.log("Done");
})();
