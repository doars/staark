import { iife } from '../../../.scripts/iife.js'

import {
  createConnector,
} from './library/client.js'

iife([
  'roupn',
], {
  createConnector,
})
