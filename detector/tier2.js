const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../helpers/logger');

async function detect(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    const inlineScripts = $('script:not([src])').map((i, el) => $(el).html()).get();
    const metas = $('meta[name]').map((i, el) => \`\${$(el).attr('name')}=\${$(el).attr('content')}\`).get();
    const evidence = [];
    inlineScripts.forEach(code => { if (/RazorpayCheckout|StripeCheckout/i.test(code)) evidence.push('inline-script'); });
    metas.forEach(m => { if (/payment_gateway/i.test(m)) evidence.push('meta-tag'); });
    return { evidence };
  } catch (err) {
    logger.error('Tier2 error', { url, err: err.message });
    return { evidence: [], error: err.message };
  }
}

module.exports = { detect };
