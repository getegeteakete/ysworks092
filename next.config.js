/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  serverExternalPackages: ['imap', 'mailparser'],
}
module.exports = nextConfig
