variable "API_IMAGE" {
  default = "ghcr.io/adelson70/foodhope/api"
}

variable "WEB_IMAGE" {
  default = "ghcr.io/adelson70/foodhope/web"
}

variable "SHA" {
  default = "latest"
}

variable "VITE_API_URL" {
  default = "https://foodhope-api.abjr.dev"
}

variable "VITE_SITE_URL" {
  default = "https://foodhope.abjr.dev"
}

group "default" {
  targets = ["api", "web"]
}

target "api" {
  context    = "./api"
  dockerfile = "Dockerfile"
  tags = [
    "${API_IMAGE}:${SHA}",
    "${API_IMAGE}:latest",
  ]
  cache-from = [
    "type=gha,scope=api",
    "type=registry,ref=${API_IMAGE}:latest",
  ]
  cache-to = ["type=gha,mode=max,scope=api"]
}

target "web" {
  context    = "./web"
  dockerfile = "Dockerfile"
  tags = [
    "${WEB_IMAGE}:${SHA}",
    "${WEB_IMAGE}:latest",
  ]
  args = {
    VITE_API_URL  = VITE_API_URL
    VITE_SITE_URL = VITE_SITE_URL
  }
  cache-from = [
    "type=gha,scope=web",
    "type=registry,ref=${WEB_IMAGE}:latest",
  ]
  cache-to = ["type=gha,mode=max,scope=web"]
}
