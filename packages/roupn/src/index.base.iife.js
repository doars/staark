import { iife } from '../../../helpers/iife.js'

import {
  createClientConnector,
} from './library/client-connector.js'

iife([
  'roupn',
], {
  createClientConnector,
})
