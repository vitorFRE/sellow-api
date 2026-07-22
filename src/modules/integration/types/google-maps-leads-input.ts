export type GoogleMapsLeadsRunInput = {
  searchQueries: string[];
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults: number;
};

export type IntegrationImportSummary = {
  itemCount: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};
