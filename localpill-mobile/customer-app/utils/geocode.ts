import * as Location from 'expo-location';

export async function getFormattedAddress(latitude: number, longitude: number): Promise<string> {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (apiKey) {
        try {
            if (__DEV__) console.log(`Geocoding with Google Maps API for ${latitude}, ${longitude}...`);
            const fetchPromise = fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Google Maps API timeout')), 4000)
            );

            const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

            const data = await response.json();

            if (__DEV__) console.log("Google Maps Geocode API Status:", data.status);

            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const firstResult = data.results[0];
                let formattedAddress = firstResult.formatted_address;

                // Extract plus code if available
                let plusCodeStr = '';
                if (data.plus_code && data.plus_code.compound_code) {
                    plusCodeStr = data.plus_code.compound_code.split(' ')[0]; // gets the short code, e.g. "J55H+PGW"
                } else if (firstResult.plus_code && firstResult.plus_code.compound_code) {
                    plusCodeStr = firstResult.plus_code.compound_code.split(' ')[0];
                }

                if (plusCodeStr && !formattedAddress.startsWith(plusCodeStr)) {
                    // Prepend the Plus Code if it's not already in the formatted address
                    formattedAddress = `${plusCodeStr}, ${formattedAddress}`;
                }

                return formattedAddress;
            }
        } catch (error) {
            if (__DEV__) console.warn("Google Maps Geocoding failed, falling back to expo-location", error);
        }
    }

    // Fallback if no API key or API fails
    try {
        if (__DEV__) console.log("Falling back to expo-location for reverse geocoding...");
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise<any[]>((_, reject) => {
            setTimeout(() => reject(new Error("expo-location reverseGeocodeAsync timed out")), 5000);
        });

        const geocodePromise = Location.reverseGeocodeAsync({ latitude, longitude });

        const geocode = await Promise.race([geocodePromise, timeoutPromise]);

        if (geocode && geocode.length > 0) {
            if (__DEV__) console.log("expo-location returned results");
            const addr = geocode[0];
            const fullAddressParts = [
                addr.name,
                addr.streetNumber,
                addr.street,
                addr.subregion,
                addr.city,
                addr.region,
                addr.postalCode,
                addr.country
            ].filter(Boolean);
            const uniqueParts = [...new Set(fullAddressParts)];
            return uniqueParts.join(', ');
        } else {
            if (__DEV__) console.log("expo-location returned empty array");
        }
    } catch (error) {
        if (__DEV__) console.warn('Fallback reverse geocoding failed', error);
    }

    if (__DEV__) console.log("All geocoding failed, returning coordinates");
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
