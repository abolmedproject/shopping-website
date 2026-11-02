#!/bin/bash
set -e

if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "Initializing database cluster..."
    su-exec postgres initdb -D "$PGDATA" --auth-local=trust --auth-host=trust
    
    echo "listen_addresses = '*'" >> "$PGDATA/postgresql.conf"
    echo "host all all 0.0.0.0/0 trust" >> "$PGDATA/pg_hba.conf"
    echo "host all all ::/0 trust" >> "$PGDATA/pg_hba.conf"
    
    su-exec postgres pg_ctl -D "$PGDATA" -w start
    su-exec postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
    su-exec postgres psql -c "CREATE DATABASE medusa;"
    su-exec postgres psql -c "CREATE DATABASE \"medusa-db\";"
    su-exec postgres pg_ctl -D "$PGDATA" -m fast -w stop
fi

exec su-exec postgres postgres -D "$PGDATA" -h 0.0.0.0
