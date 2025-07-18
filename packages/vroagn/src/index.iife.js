import { iife } from '../../../helpers/iife.js'

import { create } from './library/request.js'

import { csvParser } from './library/parsers/csv.js'
import { iniParser } from './library/parsers/ini.js'
import { tomlParser } from './library/parsers/toml.js'
import { yamlParser } from './library/parsers/yaml.js'

iife([
  'vroagn',
], {
  create,

  csvParser,
  iniParser,
  tomlParser,
  yamlParser,
})
