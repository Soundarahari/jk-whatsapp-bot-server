FROM ghcr.io/puppeteer/puppeteer:latest

# Skip downloading Chrome since we use the pre-installed one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

CMD [ "npm", "start" ]
