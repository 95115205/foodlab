# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Production: set ALLOWED_ORIGINS env var (e.g., "https://yourdomain.com")
# Development: defaults to allow all origins
allowed_origins = ENV.fetch("ALLOWED_ORIGINS", "*").split(",")

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed_origins)

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end

