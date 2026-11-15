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

variable "VITE_APP_VERSION" {
  default = "1.0.0"
}

variable "VITE_GIT_SHA" {
  default = "dev"
}

variable "VITE_FIREBASE_API_KEY" {
  default = ""
}

variable "VITE_FIREBASE_PROJECT_ID" {
  default = ""
}

variable "VITE_FIREBASE_MESSAGING_SENDER_ID" {
  default = ""
}

variable "VITE_FIREBASE_APP_ID" {
  default = ""
}

variable "VITE_FIREBASE_VAPID_KEY" {
  default = ""
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
    VITE_API_URL     = VITE_API_URL
    VITE_SITE_URL    = VITE_SITE_URL
    VITE_APP_VERSION = VITE_APP_VERSION
    VITE_GIT_SHA     = VITE_GIT_SHA
    VITE_FIREBASE_API_KEY = VITE_FIREBASE_API_KEY
    VITE_FIREBASE_PROJECT_ID = VITE_FIREBASE_PROJECT_ID
    VITE_FIREBASE_MESSAGING_SENDER_ID = VITE_FIREBASE_MESSAGING_SENDER_ID
    VITE_FIREBASE_APP_ID = VITE_FIREBASE_APP_ID
    VITE_FIREBASE_VAPID_KEY = VITE_FIREBASE_VAPID_KEY
  }
  cache-from = [
    "type=gha,scope=web",
    "type=registry,ref=${WEB_IMAGE}:latest",
  ]
  cache-to = ["type=gha,mode=max,scope=web"]
}
