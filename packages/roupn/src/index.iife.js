import { iife } from '../../../helpers/iife.js'

import {
  createClientConnector,
} from './library/client-connector.js'
import {
  createClientSynchronizer,
} from './library/client-synchronizer.js'

iife([
  'roupn',
], {
  createClientConnector,
  createClientSynchronizer,
})
