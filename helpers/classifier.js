const gatewayMap = [
  { pattern: /razorpay\.com|checkout\.razorpay/i, name: 'Razorpay' },
  { pattern: /stripe\.com|checkout\.stripe/i, name: 'Stripe' },
  { pattern: /checkout\.payu/i, name: 'PayU' },
  { pattern: /cashfree\.com/i, name: 'Cashfree' },
  { pattern: /ccavenue/i, name: 'CCAvenue' }
];

function classify(evidence) {
  let gateway = null, method = null, confidence = 0;
  for (const ev of evidence) {
    for (const map of gatewayMap) {
      if (map.pattern.test(ev)) {
        gateway = map.name;
        method = 'pattern-match';
        confidence = 0.9;
        break;
      }
    }
    if (gateway) break;
  }
  return { gateway, method, confidence };
}

module.exports = { classify };
