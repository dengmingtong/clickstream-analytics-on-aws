#!/bin/sh
# vim:sw=4:ts=4:et

set -e

if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    exec 3>&1
else
    exec 3>/dev/null
fi

if [ "$1" = "nginx" -o "$1" = "nginx-debug" ]; then
    if /usr/bin/find "/docker-entrypoint.d/" -mindepth 1 -maxdepth 1 -type f -print -quit 2>/dev/null | read v; then
        echo >&3 "$0: /docker-entrypoint.d/ is not empty, will attempt to perform configuration"

        echo >&3 "$0: Looking for shell scripts in /docker-entrypoint.d/"
        find "/docker-entrypoint.d/" -follow -type f -print | sort -V | while read -r f; do
            case "$f" in
                *.sh)
                    if [ -x "$f" ]; then
                        echo >&3 "$0: Launching $f";
                        "$f"
                    else
                        # warn on shell scripts without exec bit
                        echo >&3 "$0: Ignoring $f, not executable";
                    fi
                    ;;
                *) echo >&3 "$0: Ignoring $f";;
            esac
        done

        echo >&3 "$0: Configuration complete; ready for start up"
    else
        echo >&3 "$0: No files found in /docker-entrypoint.d/, skipping configuration"
    fi
fi

echo "SERVER_ENDPOINT_PATH: $SERVER_ENDPOINT_PATH"
echo "NGINX_WORKER_CONNECTIONS: $NGINX_WORKER_CONNECTIONS"
echo "SERVER_CORS_ORIGIN: $SERVER_CORS_ORIGIN"


echo "CUSTOM_ADDITION_INFO: $CUSTOM_ADDITION_INFO"

if [ -n "$CUSTOM_ADDITION_INFO" ]; then
    CUSTOM_ADDITION_INFO=$(echo "$CUSTOM_ADDITION_INFO" | sed 's/ //g')

    additionInfoList=$(echo "$CUSTOM_ADDITION_INFO" | sed 's/,/ /g')

    START_PORT=8650

    for additionInfo in $additionInfoList; do    
        domainName=$(echo "$additionInfo" | cut -d "#" -f 1)


        sed -i '/%%SERVER_BLOCK%%/r /etc/nginx/nginx-server-snap.txt' /etc/nginx/nginx-custom.conf
        sed -i "s/%%DOMAIN_NAME%%/$domainName/g" /etc/nginx/nginx-custom.conf

        endpointPaths=$(echo "$additionInfo" | cut -d "#" -f 2)   

        endpointPathList=$(echo "$endpointPaths" | sed 's/:/ /g')
        
        for endpointPath in $endpointPathList; do
            echo endpointPath:$endpointPath
            sed -i '/%%PATH_BLOCK%%/r /etc/nginx/nginx-path-snap.txt' /etc/nginx/nginx-custom.conf
            sed -i "s|%%SERVER_ENDPOINT_PATH%%|$endpointPath|g" /etc/nginx/nginx-custom.conf
            sed -i "s/%%VECTOR_PORT%%/$START_PORT/g" /etc/nginx/nginx-custom.conf
            START_PORT=$((START_PORT + 1))
        done
        sed -i 's/%%PATH_BLOCK%%//g' /etc/nginx/nginx-custom.conf
    done
    sed -i 's/%%SERVER_BLOCK%%//g' /etc/nginx/nginx-custom.conf
    cp /etc/nginx/nginx-custom.conf /etc/nginx/nginx.conf
else
    sed -i "s/%%SERVER_ENDPOINT_PATH%%/$SERVER_ENDPOINT_PATH/g" /etc/nginx/nginx.conf    
fi

if [ -z "$SERVER_CORS_ORIGIN" ]; then
    sed -i "s/%%SERVER_CORS_ORIGIN%%/''/g" /etc/nginx/nginx.conf
else
    sed -i "s/%%SERVER_CORS_ORIGIN%%/$SERVER_CORS_ORIGIN/g;" /etc/nginx/nginx.conf
fi

sed -i "s/%%NGINX_WORKER_CONNECTIONS%%/$NGINX_WORKER_CONNECTIONS/g" /etc/nginx/nginx.conf

echo "$(cat /etc/nginx/nginx.conf)"

exec "$@"
