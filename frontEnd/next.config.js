const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
        domains: [],
    },
    output: 'standalone',
    async redirects() {
        return [
            { source: '/sozlesmeler', destination: '/contracts', permanent: true },
            { source: '/sayfa/:slug', destination: '/page/:slug', permanent: true },
        ];
    },
}

// Load environment variables from root .env file
if (typeof window === 'undefined') {
    const { loadEnvConfig } = require('@next/env');
    const projectDir = path.join(__dirname, '..');
    loadEnvConfig(projectDir);
}

module.exports = nextConfig
