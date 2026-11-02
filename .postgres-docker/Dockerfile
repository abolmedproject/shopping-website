FROM alpine:latest
RUN apk add --no-cache postgresql postgresql-contrib su-exec bash
ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p /var/lib/postgresql/data /run/postgresql && chown -R postgres:postgres /var/lib/postgresql /run/postgresql
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 5432
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
