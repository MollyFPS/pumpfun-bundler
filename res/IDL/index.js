"use strict";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pumpFunJson = JSON.parse(
    readFileSync(join(__dirname, './pump-fun.json'), 'utf8')
);

export const IDL = pumpFunJson;
