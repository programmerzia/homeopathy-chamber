FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787 DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8787
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "src/index.ts"]
