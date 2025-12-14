const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
        domains: [],
    },
    output: 'standalone',
}

// Load environment variables from root .env file
if (typeof window === 'undefined') {
    const { loadEnvConfig } = require('@next/env');
    const projectDir = path.join(__dirname, '..');
    loadEnvConfig(projectDir);
}

module.exports = nextConfig
