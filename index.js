const express = require('express');
const tier1 = require('./detectors/tier1');
const tier2 = require('./detectors/tier2');
const tier3 = require('./detectors/tier3');
const tier4 = require('./detectors/tier4');
const logger = require('./helpers/logger');
const classifier = require('./helpers/classifier');

const app = express();
app.use(express.json());

app.post('/detect', async (req, res) => {
  const { url, schema } = req.body;
  if (!url) return res.status(400).json({ code: 'MISSING_URL', message: 'URL is required' });
  try {
    let result;
    // Schema-based variant override for Tier 3
    if (schema?.offers?.length) {
      const offer = Array.isArray(schema.offers) ? schema.offers[0] : schema.offers;
      const variantUrl = offer.url.startsWith('http') ? offer.url : new URL(url).origin + offer.url;
      result = await tier3.detect(variantUrl, schema);
      result.tier = result.evidence.length ? 3 : 0;
    } else {
      result = await tier1.detect(url);
      result.tier = result.evidence.length ? 1 : 0;
      if (!result.tier) {
        result = await tier2.detect(url);
        result.tier = result.evidence.length ? 2 : 0;
      }
      if (!result.tier) {
        result = await tier3.detect(url);
        result.tier = result.evidence.length ? 3 : 0;
      }
      if (!result.tier) {
        result = await tier4.detect(url);
        result.tier = result.evidence.length ? 4 : 0;
      }
    }
    if (!result.tier) throw { code: 'NOT_DETECTED', message: 'No gateway detected', tierReached: 4 };
    const classification = classifier.classify(result.evidence);
    result.gateway = classification.gateway;
    result.confidence = classification.confidence;
    result.detection_method = classification.method;
    res.json(result);
  } catch (err) {
    logger.error('Detection error', err);
    res.status(500).json({
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Unknown error'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
