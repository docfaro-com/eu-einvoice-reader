import { DOMParser } from '@xmldom/xmldom';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { XmlParser } from '../src/xml.ts';
import { decodeXmlBytes } from '../src/xml.ts';

export const parser = new DOMParser() as unknown as XmlParser;

const SAMPLES = join(import.meta.dirname, 'samples');
export const sampleBytes = (name: string) => new Uint8Array(readFileSync(join(SAMPLES, name)));
export const sample = (name: string) => decodeXmlBytes(sampleBytes(name));

/* Downloaded by `npm run fixtures`; see test/fixtures.json for sources, checksums and licences. */
export const FIXTURES = process.env.FIXTURES_DIR ?? join(import.meta.dirname, '../fixtures');

export interface FixtureEntry {
  path: string;
  url: string;
  sha256: string;
  license: string;
  expected?: Record<string, unknown> & {
    kind: string;
    number: string;
    issueDate: string;
    seller: string;
    buyer: string;
    currency: string;
    total: string;
    typeCode?: string;
    knownFails?: string[];
  };
}

export const manifest: FixtureEntry[] = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures.json'), 'utf8'));
export const fixturePresent = (rel: string) => existsSync(join(FIXTURES, rel));
export const fixtureBytes = (rel: string) => new Uint8Array(readFileSync(join(FIXTURES, rel)));
export const fixture = (rel: string) => decodeXmlBytes(fixtureBytes(rel));
