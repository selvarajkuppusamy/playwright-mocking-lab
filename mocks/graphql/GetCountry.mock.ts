// Auto-generated from HAR file
// Operation: GetCountry
// Schema Hash: 0996c8a1785013035170df0cd9c29b2b
// Last Updated: 2026-01-03T10:33:05.134Z
import type { Country } from "./generated-types";

export interface GetCountryResponse {
  data: {
    country: Country | null;
  };
}

export const GetCountryMock: GetCountryResponse = {
  "data": {
    "country": {
      "code": "US",
      "emoji": "🇺🇸",
      "emojiU": "U+1F1FA U+1F1F8",
      "capital": "Washington D.C.",
      "currency": "USD,USN,USS",
      "currencies": ["USD", "USN", "USS"],
      "name": "United States",
      "native": "United States",
      "phone": "1",
      "phones": ["1"],
      "awsRegion": "us-east-1",
      "continent": {
        "code": "NA",
        "name": "North America",
        "countries": []
      },
      "languages": [],
      "states": [],
      "subdivisions": []
    }
  }
};

export const metadata = {
  "operationName": "GetCountry",
  "schemaHash": "0996c8a1785013035170df0cd9c29b2b",
  "lastUpdated": "2026-01-03T10:33:05.134Z"
};
