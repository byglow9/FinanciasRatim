FROM node:22.23.5-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json server/
RUN npm ci --omit=dev --prefix server
COPY server server
COPY shared shared
USER node
CMD ["node", "server/src/index.js"]
