#!/bin/sh

cp nginx-new-copy.conf nginx-new.conf

CUSTOM_ADDITION_INFO=' domain1, domain2, domain3'

NGINX_WORKER_CONNECTIONS=10

SERVER_CORS_ORIGIN='.*'

IFS=','

START_PORT=8660

# 循环打印每个域名
for domain in "${domain_list[@]}"; do
    # 去掉域名中的空格
    domain="${domain//[[:space:]]/}"
    echo domain: "$domain"
    gsed -i '/%%SERVER_BLOCK%%/r nginx-server-snap.txt' nginx-new.conf
    gsed -i "s/%%DOMAIN_NAME%%/$domain/g" nginx-new.conf
    for path in "${path_list[@]}"; do
        # 去掉域名中的空格
        path="${path//[[:space:]]/}"
        echo path: "$path"
        START_PORT=$((START_PORT + 1))
        echo $START_PORT
        gsed -i '/%%PATH_BLOCK%%/r nginx-path-snap.txt' nginx-new.conf
        gsed -i "s/%%SERVER_ENDPOINT_PATH%%/$path/g" nginx-new.conf 
        gsed -i "s/%%VECTOR_PORT%%/$START_PORT/g" nginx-new.conf
    done
    gsed -i 's/%%PATH_BLOCK%%//g' nginx-new.conf
done
gsed -i 's/%%SERVER_BLOCK%%//g' nginx-new.conf

if [ -z "$SERVER_CORS_ORIGIN" ]; then
    gsed -i "s/%%SERVER_CORS_ORIGIN%%/''/g" nginx-new.conf
else
    gsed -i "s#%%SERVER_CORS_ORIGIN%%#$SERVER_CORS_ORIGIN#g;" nginx-new.conf
fi

gsed -i "s#%%NGINX_WORKER_CONNECTIONS%%#$NGINX_WORKER_CONNECTIONS#g;" nginx-new.conf