FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage pengembangan. Sengaja diletakkan SEBELUM `runner`, karena stage
# terakhirlah yang dipakai saat `docker build` tanpa --target; menaruhnya di
# akhir akan diam-diam mengubah image produksi jadi image dev.
#
# Stage ini hanya memasang dependency. Kode sumber TIDAK disalin, melainkan
# di-bind-mount dari host lewat docker-compose.dev.yml, sehingga perubahan di
# editor langsung terlihat tanpa rebuild image.
FROM node:20-alpine AS dev
WORKDIR /app

COPY package*.json ./
RUN npm ci

ENV NODE_ENV=development
ENV PORT=3000
# Bind mount pada beberapa filesystem tidak meneruskan event inotify ke dalam
# container. Polling lebih boros, tetapi hot reload yang diam-diam mati jauh
# lebih mahal waktunya saat debugging.
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 3000
CMD ["npm", "run", "dev"]


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Image node menyediakan pengguna "node" (uid 1000) yang bukan root.
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "start"]
