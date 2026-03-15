import * as Location from 'expo-location';

export async function getFormattedAddress(latitude: number, longitude: number): Promise<string> {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (apiKey) {
        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
            const data = await response.json();

            if (data.status === 'OK' && data.results && data.results.length > 0) {
                // Find the most detailed result (usually the first one)
                const streetAddress = data.results.find((r: any) => r.types.includes('street_address')) || data.results[0];
                let formattedAddress = streetAddress.formatted_address;

                // Extract plus code if available
                let plusCodeStr = '';
                if (data.plus_code && data.plus_code.compound_code) {
                    plusCodeStr = data.plus_code.compound_code.split(' ')[0];
                } else if (streetAddress.plus_code && streetAddress.plus_code.compound_code) {
                    plusCodeStr = streetAddress.plus_code.compound_code.split(' ')[0];
                }

                if (plusCodeStr && !formattedAddress.toLowerCase().includes(plusCodeStr.toLowerCase())) {
                    formattedAddress = `${plusCodeStr}, ${formattedAddress}`;
                }

                return formattedAddress;
            }
        } catch (error) {
            console.warn("Google Maps Geocoding failed, falling back to expo-location", error);
        }
    }

    // Fallback if no API key or API fails
    try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode && geocode.length > 0) {
            const addr = geocode[0];

            // Build a more comprehensive address string from components
            const parts = [
                addr.name,
                addr.streetNumber,
                addr.street,
                addr.district,
                addr.subregion,
                addr.city,
                addr.region,
                addr.postalCode,
                addr.country
            ].filter(Boolean);

            // Filter out duplicate or subset strings
            const uniqueParts: string[] = [];
            parts.forEach(part => {
                if (part && !uniqueParts.some(up => up.includes(part) || part.includes(up))) {
                    uniqueParts.push(part);
                }
            });

            return uniqueParts.join(', ');
        }
    } catch (error) {
        console.warn('Fallback reverse geocoding failed', error);
    }

    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
