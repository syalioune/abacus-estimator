# Thin wrappers. Everything here is also available as an npm script.
.DEFAULT_GOAL := help
IMAGE ?= abacus-estimator
TAG   ?= local

.PHONY: help install dev test check build image run stop clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci

dev: ## Run the dev server on :5173
	npm run dev

test: ## Run the test suite once
	npm test

check: ## Lint, format check and test — what CI runs
	npm run check

build: ## Produce the static bundle in dist/
	npm run build

image: ## Build the container image
	docker build -t $(IMAGE):$(TAG) .

run: image ## Build and serve the image on :8080
	docker run --rm -d --name abacus -p 8080:8080 \
	  --read-only --tmpfs /tmp --tmpfs /var/cache/nginx --tmpfs /var/run \
	  --cap-drop ALL --security-opt no-new-privileges:true $(IMAGE):$(TAG)
	@echo "http://localhost:8080"

stop: ## Stop the running container
	-docker rm -f abacus

clean: ## Remove build output
	rm -rf dist coverage
