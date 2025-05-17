const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../helpers/logger');

async function detect(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    const scripts = $('script[src]').map((i, el) => $(el).attr('src')).get();
    const evidence = scripts.filter(src => /razorpay|stripe|payu|cashfree|ccavenue/i.test(src));
    return { evidence };
  } catch (err) {
    logger.error('Tier1 error', { url, err: err.message });
    return { evidence: [], error: err.message };
  }
}

module.exports = { detect };
