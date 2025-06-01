import { iife } from '../../../.scripts/iife.js'

import {
  createClientConnector,
} from './library/client-connector.js'

iife([
  'roupn',
], {
  createClientConnector,
})
