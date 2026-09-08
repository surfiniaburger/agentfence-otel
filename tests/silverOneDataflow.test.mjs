import assert from 'node:assert/strict';
import { SILVER_ONE_GRAPH, evaluateSilverOneReachability } from '../lib/silverOneDataflow.js';

assert.equal(evaluateSilverOneReachability(SILVER_ONE_GRAPH.vulnerable), 1.0);
assert.equal(evaluateSilverOneReachability(SILVER_ONE_GRAPH.fixed), 0.05);

const malformed = structuredClone(SILVER_ONE_GRAPH.fixed);
malformed.signatures[0].sink_id = 'missing';
assert.equal(evaluateSilverOneReachability(malformed), 1.0);

console.log('Silver-One dataflow contract tests: PASS');
