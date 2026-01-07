import { env } from "@mongez/dotenv";

export type GoogleConfigurations = {
  apiKey: string;
  host: string;
  placeId: string;
  country?: string;
};

const googleConfigurations: GoogleConfigurations = {
  apiKey: env("GOOGLE_API_KEY", "api key"),
  host: env("GOOGLE_HOST", "google host"),
  placeId: env("GOOGLE_PLACE_ID", "place id"),
};

/**
 * GOOGLE_PLACE_ID=ChIJ80f_5nUNCjIRYWT3CfZFzio
   GOOGLE_API_KEY=AIzaSyANZrh4CD14F2qXbMhHPjohHmZDVoN4tHU
   GOOGLE_HOST=https://maps.googleapis.com/maps/api/place/details/json
 */

export default googleConfigurations;
