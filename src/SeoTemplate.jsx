import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SeoHelmet from './components/SeoHelmet';
import LandingUser from './LandingUser'; // We'll re-use the user landing page as the visual body, but with custom SEO tags

export default function SeoTemplate({ type }) {
    const { slug, city, area } = useParams();
    const [seoData, setSeoData] = useState({ title: '', description: '', path: '' });

    useEffect(() => {
        // In a full implementation, we might fetch specific data from Firestore based on the slug.
        // For the foundation layer, we synthetically generate the tags based on the URL parameters.
        if (type === 'medicine' && slug) {
            const medicineName = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            setSeoData({
                title: `Check availability of ${medicineName} near you - LocalPill`,
                description: `Check availability of ${medicineName} at nearby licensed pharmacies. Connect directly to confirm stock and avoid waiting.`,
                path: `/medicine/${slug}`
            });
        } else if (type === 'pharmacy' && city && area) {
            const cityName = city.charAt(0).toUpperCase() + city.slice(1);
            const areaName = area.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            setSeoData({
                title: `Top Pharmacies in ${areaName}, ${cityName} - LocalPill`,
                description: `Find the best verified medical stores and pharmacies in ${areaName}, ${cityName}. Connect directly and check medicine availability instantly.`,
                path: `/pharmacy/${city}/${area}`
            });
        }
    }, [type, slug, city, area]);

    return (
        <>
            <SeoHelmet
                title={seoData.title || "LocalPill - Find Medicine Nearby"}
                description={seoData.description || "Search medicines & connect with local pharmacies."}
                canonicalPath={seoData.path}
            />
            {/* 
                For the foundation phase, we simply render the standard LandingUser page. 
                Google's bots will read the <head> tags modified by SeoHelmet above, 
                while users see the normal app interface and can immediately search.
            */}
            <LandingUser />
        </>
    );
}
