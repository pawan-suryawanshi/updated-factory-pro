import { Alert } from "react-native";
import * as Location from "expo-location";

// Clean the address before encoding (optional but helpful)
const cleanAddress = (address) => {
  return address
    .replace(/\(.*?\)/g, "")  // Remove things like "(Near Temple)"
    .replace(/;/g, ",")       // Semicolon to comma
    .trim();
};

// Fetch coordinates from DistanceMatrix.ai Geocoding API
export const getCoordinates = async (address) => {
  if (!address) {
    console.error("Invalid address provided.");
    return null;
  }

  const cleanedAddress = cleanAddress(address);
  const apiKey = "Il2QQd9F7CFZbO9MkruwZcDo5ZVIbpoFPLP5K7gMXe3W27Zj6bKGx33CuLUCRsHV";
  const encodedAddress = encodeURIComponent(cleanedAddress);
  const url = `https://api.distancematrix.ai/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  console.log("Fetching coordinates for:", cleanedAddress);

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Geocode API Response:", data);

    if (data && data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      const coordinates = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
      console.log("Coordinates:", coordinates);
      return coordinates;
    } else {
      console.error("No coordinates found for address:", cleanedAddress);
      return null;
    }
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};
