FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
COPY adapters adapters
COPY tsconfig.json ./
RUN npm ci
COPY apps/api apps/api
CMD ["npm", "run", "api:dev"]
