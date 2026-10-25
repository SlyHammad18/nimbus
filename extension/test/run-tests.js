// nimbus-units runner: imports the test suite, runs, exits nonzero on failure.

import System from 'system';

import {runAll} from './test-harness.js';
import './suite.js';

const failures = await runAll();
if (failures > 0)
    System.exit(1);
