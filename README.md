# Payment Gateway Detector

## Directory Structure

```
/pg-detector
│
├── index.js               # Entry point & tier orchestrator
├── package.json           # Dependencies & start script
├── Dockerfile             # Container config with Playwright deps
├── detectors/
│   ├── tier1.js
│   ├── tier2.js
│   ├── tier3.js
│   └── tier4.js
├── helpers/
│   ├── utils.js
│   ├── logger.js
│   └── classifier.js
├── evidence/              # Per-run JSON evidence snapshots
├── output/                # HAR logs & screenshots
└── README.md
```

## Installation

```bash
npm install
```

## Usage

```bash
PORT=3000 node index.js
```

## Docker

```bash
docker build -t pg-detector .
docker run -p 3000:3000 pg-detector
```

## API

**POST** `/detect`

Body:
```json
{
  "url": "https://example.com/products/xyz?variant=123",
  "schema": { /* JSON-LD Product object */ }
}
```

Response:
```json
{
  "gateway": "Razorpay",
  "confidence": 0.9,
  "tier": 3,
  "evidence": ["https://checkout.razorpay.com/v1/checkout.js"],
  "detection_method": "pattern-match"
}
```
