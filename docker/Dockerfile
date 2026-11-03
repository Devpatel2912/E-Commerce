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

COPY --chown=node:node . .

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

USER node

EXPOSE 5000

CMD ["npm", "start"]
