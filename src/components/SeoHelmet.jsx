import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SeoHelmet({ title, description, canonicalPath }) {
    const baseUrl = 'https://localpill.com'; // Production URL
    const canonicalUrl = canonicalPath ? `${baseUrl}${canonicalPath}` : baseUrl;

    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph Tags for Social Sharing */}
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:type" content="website" />

            {/* Twitter Card Tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
        </Helmet>
    );
}
