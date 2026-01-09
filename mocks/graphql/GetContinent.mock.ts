// Auto-generated from HAR file
// Operation: GetContinent
// Schema Hash: 16feb7879a6b24a4e065f14d57db6375
// Last Updated: 2026-01-03T10:33:05.134Z
import type { Continent } from "./generated-types";

export interface GetContinentResponse {
  data: {
    continent: Continent;
  };
}

export const GetContinentMock: GetContinentResponse = {
  "data": {
    "continent": {
      "code": "NA",
      "name": "North America",
      "countries": []
    }
  }
};

export const metadata = {
  "operationName": "GetContinent",
  "schemaHash": "16feb7879a6b24a4e065f14d57db6375",
  "lastUpdated": "2026-01-03T10:33:05.134Z"
};
