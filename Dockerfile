FROM ghcr.io/puppeteer/puppeteer:latest

# Skip downloading Chrome since we use the pre-installed one from the image
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

CMD [ "npm", "start" ]
