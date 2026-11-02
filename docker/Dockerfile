FROM node:26-bookworm-slim AS dependencies

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts \
    && npm rebuild bcrypt \
    && npm cache clean --force


FROM node:26-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node package.json ./

COPY --chown=node:node server.js app.js ./

COPY --chown=node:node admin auth category config listing listing-image message middleware migrations payment refund review routes search-history transaction users utils ./

USER node

EXPOSE 5000

CMD ["npm", "start"]
